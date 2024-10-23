import type { WaterSystemDependenciesInterface } from '@factories/waterSystemFactory';
import { createDamService, type DamServiceInterface } from '@services/damService';
import { createGlacierService, type GlacierServiceInterface } from '@services/glacierService';
import { createInflowAggregator, type InflowSourceInterface } from '@services/inflowAggregator';
import { createRiverService, type RiverServiceInterface } from '@services/riverService';
import { createWeatherService, type WeatherServiceInterface } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, takeUntil } from 'rxjs/operators';
import { onUnmounted } from 'vue';

export function useWaterSystem(dependencies: WaterSystemDependenciesInterface): WaterSystemInterface {
  const {
    createDamService,
    createGlacierService,
    createRiverService,
    createWeatherService,
    errorHandlingService,
    loggingService,
    createInflowAggregator
  } = dependencies;

  const services = createServices();
  const states = createStates();
  const { addSource, removeSource, aggregatedInflow$ } = createInflowAggregator([]);
  const totalInflow$ = createTotalInflowObservable(aggregatedInflow$);
  const destroy$ = new Subject<void>();

  const systemState$ = createSystemStateObservable(states, loggingService, errorHandlingService);
  const totalWaterVolume$ = createTotalWaterVolumeObservable(states, loggingService, errorHandlingService);

  const cleanup = () => {
    destroy$.next();
    destroy$.complete();
    services.damService?.cleanup();
    services.glacierService?.cleanup();
    services.riverService?.cleanup();
    services.weatherService?.cleanup();
    states.damState$.complete();
    states.glacierState$.complete();
    states.riverState$.complete();
    states.mainWeatherState$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  };

  onUnmounted(cleanup);

  return {
    initializeDam: (initialData) => initializeDam(initialData, services, states, totalInflow$, destroy$, loggingService, errorHandlingService),
    initializeGlacier: (initialData) => initializeGlacier(initialData, services, states, addSource, totalInflow$, destroy$, loggingService, errorHandlingService),
    initializeRiver: (initialData) => initializeRiver(initialData, services, states, addSource, totalInflow$, destroy$, loggingService, errorHandlingService),
    initializeMainWeatherStation: (id, name, subStationConfigs) => initializeMainWeatherStation(id, name, subStationConfigs, services, states, destroy$, loggingService, errorHandlingService),
    systemState$,
    totalWaterVolume$,
    cleanup: () => cleanup(),
    error$: errorHandlingService.getErrorObservable().pipe(
      map(error => error ? { 
        message: error.message, 
        code: error.code, 
        timestamp: Date.now() 
      } : null) 
    )
  };
}

function createServices() {
  return {
    damService: null as DamServiceInterface | null,
    glacierService: null as GlacierServiceInterface | null,
    riverService: null as RiverServiceInterface | null,
    weatherService: null as WeatherServiceInterface | null
  };
}

function createStates() {
  return {
    damState$: new BehaviorSubject<DamInterface | null>(null),
    glacierState$: new BehaviorSubject<GlacierStateInterface | null>(null),
    riverState$: new BehaviorSubject<RiverStateInterface | null>(null),
    mainWeatherState$: new BehaviorSubject<MainWeatherStationInterface | null>(null)
  };
}

function createTotalInflowObservable(aggregatedInflow$: ReturnType<typeof createInflowAggregator>['aggregatedInflow$']) {
  return aggregatedInflow$.pipe(
    map((aggregatedInflow: { totalInflow: number }) => aggregatedInflow.totalInflow) // Explicitly define the type
  );
}

function initializeDam(initialData: DamInterface, services: ReturnType<typeof createServices>, states: ReturnType<typeof createStates>, totalInflow$: ReturnType<typeof createTotalInflowObservable>, destroy$: Subject<void>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
  services.damService = createDamService(initialData, totalInflow$);
  if (services.damService) {
    services.damService.getDamState$().pipe(takeUntil(destroy$)).subscribe(states.damState$);
    services.damService.startSimulation();
    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: initialData.id });
  } else {
    loggingService.error('Failed to initialize dam service', 'useWaterSystem.initializeDam', { damId: initialData.id });
    errorHandlingService.emitError({
      message: 'Failed to initialize dam service',
      code: 'DAM_INIT_ERROR',
      timestamp: Date.now(),
      context: 'useWaterSystem.initializeDam',
      data: { damId: initialData.id }
    });
  }
}

function initializeGlacier(
  initialData: GlacierStateInterface, 
  services: ReturnType<typeof createServices>, 
  states: ReturnType<typeof createStates>, 
  addSource: (source: InflowSourceInterface) => void, 
  totalInflow$: ReturnType<typeof createTotalInflowObservable>,
  destroy$: Subject<void>, 
  loggingService: WaterSystemDependenciesInterface['loggingService'], 
  errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']
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
    if (services.damService) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = states.damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState, services, states, totalInflow$, destroy$, loggingService, errorHandlingService);
      }
    }

    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: initialData.id });

    return stopSimulation;
  } else {
    loggingService.error('Failed to initialize glacier service', 'useWaterSystem.initializeGlacier', { glacierId: initialData.id });
    errorHandlingService.emitError({
      message: 'Failed to initialize glacier service',
      code: 'GLACIER_INIT_ERROR',
      timestamp: Date.now(),
      context: 'useWaterSystem.initializeGlacier',
      data: { glacierId: initialData.id }
    });
  }
}

function initializeRiver(
  initialData: RiverStateInterface, 
  services: ReturnType<typeof createServices>, 
  states: ReturnType<typeof createStates>, 
  addSource: (source: InflowSourceInterface) => void, 
  totalInflow$: ReturnType<typeof createTotalInflowObservable>,
  destroy$: Subject<void>, 
  loggingService: WaterSystemDependenciesInterface['loggingService'], 
  errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']
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
    if (services.damService) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = states.damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState, services, states, totalInflow$, destroy$, loggingService, errorHandlingService);
      }
    }

    loggingService.info('River simulation initialized', 'useWaterSystem.initializeRiver', { riverId: initialData.id });

    return stopSimulation;
  } else {
    loggingService.error('Failed to initialize river service', 'useWaterSystem.initializeRiver', { riverId: initialData.id });
    errorHandlingService.emitError({
      message: 'Failed to initialize river service',
      code: 'RIVER_INIT_ERROR',
      timestamp: Date.now(),
      context: 'useWaterSystem.initializeRiver',
      data: { riverId: initialData.id }
    });
  }
}

function initializeMainWeatherStation(id: string, name: string, subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>, services: ReturnType<typeof createServices>, states: ReturnType<typeof createStates>, destroy$: Subject<void>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
  services.weatherService = createWeatherService(id, name, subStationConfigs);
  if (services.weatherService) {
    services.weatherService.getMainWeatherState$().pipe(takeUntil(destroy$)).subscribe(states.mainWeatherState$);
    services.weatherService.startSimulation();
    loggingService.info('Main weather station initialized', 'useWaterSystem.initializeMainWeatherStation', { stationId: id });
  } else {
    loggingService.error('Failed to initialize weather service', 'useWaterSystem.initializeMainWeatherStation', { stationId: id });
    errorHandlingService.emitError({
      message: 'Failed to initialize weather service',
      code: 'WEATHER_INIT_ERROR',
      timestamp: Date.now(),
      context: 'useWaterSystem.initializeMainWeatherStation',
      data: { stationId: id }
    });
  }
}

function createSystemStateObservable(states: ReturnType<typeof createStates>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
  return combineLatest([
    states.damState$,
    states.glacierState$,
    states.riverState$,
    states.mainWeatherState$
  ]).pipe(
    map(([dam, glacier, river, mainWeather]) => ({ dam, glacier, river, mainWeather })),
    catchError(err => {
      loggingService.error('Error in system state', 'useWaterSystem.systemState$', { error: err });
      errorHandlingService.emitError({
        message: `Error in system state: ${err.message}`,
        code: 'SYSTEM_STATE_ERROR',
        timestamp: Date.now(),
        context: 'useWaterSystem.systemState$'
      });
      return of({ dam: null, glacier: null, river: null, mainWeather: null });
    }),
    shareReplay(1)
  );
}

function createTotalWaterVolumeObservable(states: ReturnType<typeof createStates>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
  return combineLatest([states.damState$, states.riverState$]).pipe(
    map(([dam, river]) => {
      if (!dam || !river) return 0;
      return dam.currentWaterLevel * dam.maxCapacity + river.waterVolume;
    }),
    catchError(err => {
      loggingService.error('Error calculating total water volume', 'useWaterSystem.totalWaterVolume$', { error: err });
      errorHandlingService.emitError({
        message: `Error calculating total water volume: ${err.message}`,
        code: 'TOTAL_WATER_VOLUME_ERROR',
        timestamp: Date.now(),
        context: 'useWaterSystem.totalWaterVolume$'
      });
      return of(0);
    }),
    shareReplay(1)
  );
}
