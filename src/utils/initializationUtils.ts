import { createDamService } from '@services/damService';
import { createGlacierService } from '@services/glacierService';
import { createRiverService } from '@services/riverService';
import { createWeatherService } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { WaterSystemDependenciesInterface } from '@type/waterSystem';
import type { WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import {
  EMPTY,
  Subject,
  asyncScheduler,
  timer
} from 'rxjs';
import {
  catchError,
  finalize,
  observeOn,
  retry,
  shareReplay,
  takeUntil,
  tap
} from 'rxjs/operators';
import { handleWaterSystemError } from './errorHandlerUtil';

export function initializeDam(
  initialData: DamInterface,
  services: ReturnType<typeof import('./waterSystemUtils').createServicesUtil>,
  states: ReturnType<typeof import('./waterSystemUtils').createStatesUtil>,
  totalInflow$: ReturnType<typeof import('./waterSystemUtils').createTotalInflowObservableUtil>,
  destroy$: Subject<void>,
  dependencies: WaterSystemDependenciesInterface
) {
  try {
    services.damService = createDamService(initialData, totalInflow$);
    if (services.damService) {
      services.damService.getDamState$().pipe(
        observeOn(asyncScheduler),
        tap(state => {
          asyncScheduler.schedule(() => {
            dependencies.loggingService.info('Dam state updated', 'initializeDam', { state });
          }, 0, { priority: -1 });
        }),
        retry({
          count: 3,
          delay: (error, retryCount) => {
            dependencies.loggingService.error('Dam state error, retrying...', 'initializeDam', { 
              error, 
              retryCount 
            });
            return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
          }
        }),
        takeUntil(destroy$),
        finalize(() => {
          dependencies.loggingService.info('Dam state stream finalized', 'initializeDam');
        }),
        catchError(error => {
          handleWaterSystemError('initializeDam', error, dependencies.errorHandlingService, dependencies.loggingService);
          return EMPTY;
        }),
        shareReplay(1)
      ).subscribe(states.damState$);

      services.damService.startSimulation();
      dependencies.loggingService.info('Dam simulation initialized', 'initializeDam', { damId: initialData.id });
    } else {
      throw new Error('Failed to create dam service');
    }
  } catch (error) {
    handleWaterSystemError('initializeDam', error, dependencies.errorHandlingService, dependencies.loggingService);
  }
}

export function initializeGlacier(
  initialData: GlacierStateInterface,
  services: ReturnType<typeof import('./waterSystemUtils').createServicesUtil>,
  states: ReturnType<typeof import('./waterSystemUtils').createStatesUtil>,
  addSource: (source: import('@services/inflowAggregator').InflowSourceInterface) => void,
  destroy$: Subject<void>,
  dependencies: WaterSystemDependenciesInterface
) {
  if (!services.weatherService) {
    throw new Error('Main weather station must be initialized before glacier');
  }

  try {
    services.glacierService = createGlacierService(initialData, services.weatherService.getTemperature$());
    if (services.glacierService) {
      services.glacierService.getGlacierState$().pipe(
        observeOn(asyncScheduler),
        tap(state => {
          asyncScheduler.schedule(() => {
            dependencies.loggingService.info('Glacier state updated', 'initializeGlacier', { state });
          }, 0, { priority: -1 });
        }),
        retry({
          count: 3,
          delay: (error, retryCount) => {
            dependencies.loggingService.error('Glacier state error, retrying...', 'initializeGlacier', { 
              error, 
              retryCount 
            });
            return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
          }
        }),
        takeUntil(destroy$),
        finalize(() => {
          dependencies.loggingService.info('Glacier state stream finalized', 'initializeGlacier');
        }),
        catchError(error => {
          handleWaterSystemError('initializeGlacier', error, dependencies.errorHandlingService, dependencies.loggingService);
          return EMPTY;
        }),
        shareReplay(1)
      ).subscribe(states.glacierState$);

      const stopSimulation = services.glacierService.startSimulation();
      addSource({ 
        name: 'Glacier', 
        outflowRate$: services.glacierService.getOutflowRate$() 
      });
      dependencies.loggingService.info('Glacier simulation initialized', 'initializeGlacier', { glacierId: initialData.id });
      return stopSimulation;
    }
  } catch (error) {
    handleWaterSystemError('initializeGlacier', error, dependencies.errorHandlingService, dependencies.loggingService);
  }
}

export function initializeRiver(
  initialData: RiverStateInterface,
  services: ReturnType<typeof import('./waterSystemUtils').createServicesUtil>,
  states: ReturnType<typeof import('./waterSystemUtils').createStatesUtil>,
  addSource: (source: import('@services/inflowAggregator').InflowSourceInterface) => void,
  destroy$: Subject<void>,
  dependencies: WaterSystemDependenciesInterface
) {
  if (!services.weatherService) {
    throw new Error('Main weather station must be initialized before river');
  }

  try {
    services.riverService = createRiverService(initialData, services.weatherService.getPrecipitation$());
    if (services.riverService) {
      services.riverService.getRiverState$().pipe(
        observeOn(asyncScheduler),
        tap(state => {
          asyncScheduler.schedule(() => {
            dependencies.loggingService.info('River state updated', 'initializeRiver', { state });
          }, 0, { priority: -1 });
        }),
        retry({
          count: 3,
          delay: (error, retryCount) => {
            dependencies.loggingService.error('River state error, retrying...', 'initializeRiver', { 
              error, 
              retryCount 
            });
            return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
          }
        }),
        takeUntil(destroy$),
        finalize(() => {
          dependencies.loggingService.info('River state stream finalized', 'initializeRiver');
        }),
        catchError(error => {
          handleWaterSystemError('initializeRiver', error, dependencies.errorHandlingService, dependencies.loggingService);
          return EMPTY;
        }),
        shareReplay(1)
      ).subscribe(states.riverState$);

      const stopSimulation = services.riverService.startSimulation();
      addSource({ 
        name: 'River', 
        outflowRate$: services.riverService.getOutflowRate$() 
      });
      dependencies.loggingService.info('River simulation initialized', 'initializeRiver', { riverId: initialData.id });
      return stopSimulation;
    }
  } catch (error) {
    handleWaterSystemError('initializeRiver', error, dependencies.errorHandlingService, dependencies.loggingService);
  }
}

export function initializeMainWeatherStation(
  id: string,
  name: string,
  subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>,
  services: ReturnType<typeof import('./waterSystemUtils').createServicesUtil>,
  states: ReturnType<typeof import('./waterSystemUtils').createStatesUtil>,
  destroy$: Subject<void>,
  dependencies: WaterSystemDependenciesInterface
) {
  try {
    services.weatherService = createWeatherService(id, name, subStationConfigs);
    if (services.weatherService) {
      services.weatherService.getMainWeatherState$().pipe(
        observeOn(asyncScheduler),
        tap(state => {
          asyncScheduler.schedule(() => {
            dependencies.loggingService.info('Weather state updated', 'initializeMainWeatherStation', { state });
          }, 0, { priority: -1 });
        }),
        retry({
          count: 3,
          delay: (error, retryCount) => {
            dependencies.loggingService.error('Weather state error, retrying...', 'initializeMainWeatherStation', { 
              error, 
              retryCount 
            });
            return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
          }
        }),
        takeUntil(destroy$),
        finalize(() => {
          dependencies.loggingService.info('Weather state stream finalized', 'initializeMainWeatherStation');
        }),
        catchError(error => {
          handleWaterSystemError('initializeMainWeatherStation', error, dependencies.errorHandlingService, dependencies.loggingService);
          return EMPTY;
        }),
        shareReplay(1)
      ).subscribe(states.mainWeatherState$);

      services.weatherService.startSimulation();
      dependencies.loggingService.info('Main weather station initialized', 'initializeMainWeatherStation', { stationId: id });
    } else {
      throw new Error('Failed to create weather service');
    }
  } catch (error) {
    handleWaterSystemError('initializeMainWeatherStation', error, dependencies.errorHandlingService, dependencies.loggingService);
  }
}
