import { createDamService } from '@services/damService';
import { createGlacierService } from '@services/glacierService';
import { createRiverService } from '@services/riverService';
import { createWeatherService } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { WaterSystemDependenciesInterface } from '@type/waterSystem';
import type { WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
        takeUntil(destroy$)
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
  services.glacierService = createGlacierService(initialData, services.weatherService.getTemperature$());
  if (services.glacierService) {
    services.glacierService.getGlacierState$().pipe(takeUntil(destroy$)).subscribe(states.glacierState$);
    const stopSimulation = services.glacierService.startSimulation();
    addSource({ 
      name: 'Glacier', 
      outflowRate$: services.glacierService.getOutflowRate$() 
    });
    dependencies.loggingService.info('Glacier simulation initialized', 'initializeGlacier', { glacierId: initialData.id });
    return stopSimulation;
  } else {
    handleWaterSystemError('initializeGlacier', new Error('Failed to create glacier service'), dependencies.errorHandlingService, dependencies.loggingService);
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
  services.riverService = createRiverService(initialData, services.weatherService.getPrecipitation$());
  if (services.riverService) {
    services.riverService.getRiverState$().pipe(takeUntil(destroy$)).subscribe(states.riverState$);
    const stopSimulation = services.riverService.startSimulation();
    addSource({ 
      name: 'River', 
      outflowRate$: services.riverService.getOutflowRate$() 
    });
    dependencies.loggingService.info('River simulation initialized', 'initializeRiver', { riverId: initialData.id });
    return stopSimulation;
  } else {
    handleWaterSystemError('initializeRiver', new Error('Failed to create river service'), dependencies.errorHandlingService, dependencies.loggingService);
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
  services.weatherService = createWeatherService(id, name, subStationConfigs);
  if (services.weatherService) {
    services.weatherService.getMainWeatherState$().pipe(takeUntil(destroy$)).subscribe(states.mainWeatherState$);
    services.weatherService.startSimulation();
    dependencies.loggingService.info('Main weather station initialized', 'initializeMainWeatherStation', { stationId: id });
  } else {
    handleWaterSystemError('initializeMainWeatherStation', new Error('Failed to create weather service'), dependencies.errorHandlingService, dependencies.loggingService);
  }
}
