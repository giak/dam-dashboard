import { createDamService } from '@services/damService';
import { createGlacierService } from '@services/glacierService';
import { type InflowSourceInterface } from '@services/inflowAggregator';
import { createRiverService } from '@services/riverService';
import { createWeatherService } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { SystemStateInterface, WaterSystemDependenciesInterface, WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { calculateTotalWaterVolumeUtil, createServicesUtil, createStatesUtil, createTotalInflowObservableUtil } from '@utils/waterSystemUtils';
import { BehaviorSubject, combineLatest, Observable, Subject, throwError } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
import { onUnmounted } from 'vue';

function handleError(context: string, error: any, errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService'], loggingService: WaterSystemDependenciesInterface['loggingService']) {
  const errorMessage = `Error in ${context}: ${error.message}`;
  loggingService.error(errorMessage, context, { error });
  errorHandlingService.emitError({
    message: errorMessage,
    code: `${context.toUpperCase()}_ERROR`,
    timestamp: Date.now(),
    context: context,
    data: { error }
  });
  return throwError(() => new Error(errorMessage));
}

// Nouvelle fonction exportée pour les tests
export function createSystemStateObservable(
  damState$: Observable<DamInterface | null>,
  glacierState$: Observable<GlacierStateInterface | null>,
  riverState$: Observable<RiverStateInterface | null>,
  mainWeatherState$: Observable<MainWeatherStationInterface | null>,
  errorHandler: (context: string, error: any) => Observable<never>
): Observable<SystemStateInterface> {
  return combineLatest([damState$, glacierState$, riverState$, mainWeatherState$]).pipe(
    map(([dam, glacier, river, mainWeather]) => ({ dam, glacier, river, mainWeather })),
    catchError(error => errorHandler('useWaterSystem.systemState$', error)),
    shareReplay(1)
  );
}

// Nouvelle fonction exportée pour les tests
export function createTotalWaterVolumeObservable(
  damState$: Observable<DamInterface | null>,
  riverState$: Observable<RiverStateInterface | null>,
  errorHandler: (context: string, error: any) => Observable<never>
): Observable<number> {
  return combineLatest([damState$, riverState$]).pipe(
    map(([dam, river]) => calculateTotalWaterVolumeUtil(dam, river)),
    distinctUntilChanged(),
    catchError(error => errorHandler('useWaterSystem.totalWaterVolume$', error)),
    shareReplay(1)
  );
}

export function useWaterSystem(dependencies: WaterSystemDependenciesInterface): WaterSystemInterface {
  const {
    errorHandlingService,
    loggingService,
    createInflowAggregator
  } = dependencies;

  const services = createServicesUtil();
  const states = createStatesUtil();
  const { addSource, aggregatedInflow$ } = createInflowAggregator([]);
  const totalInflow$ = createTotalInflowObservableUtil(aggregatedInflow$);
  const destroy$ = new Subject<void>();

  const errorHandler = (context: string, error: any) => 
    handleError(context, error, dependencies.errorHandlingService, dependencies.loggingService);

  const systemState$ = new BehaviorSubject<SystemStateInterface>({
    dam: null,
    glacier: null,
    river: null,
    mainWeather: null
  });

  const totalWaterVolume$ = createTotalWaterVolumeObservable(
    states.damState$,
    states.riverState$,
    errorHandler
  );

  const updateSystemState = (key: keyof SystemStateInterface, value: any) => {
    const currentState = systemState$.getValue();
    systemState$.next({ ...currentState, [key]: value });
  };

  states.damState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => handleError('useWaterSystem.damState$', error, errorHandlingService, loggingService))
  ).subscribe(damState => updateSystemState('dam', damState));

  states.glacierState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => handleError('useWaterSystem.glacierState$', error, errorHandlingService, loggingService))
  ).subscribe(glacierState => updateSystemState('glacier', glacierState));

  states.riverState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => handleError('useWaterSystem.riverState$', error, errorHandlingService, loggingService))
  ).subscribe(riverState => updateSystemState('river', riverState));

  states.mainWeatherState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => handleError('useWaterSystem.mainWeatherState$', error, errorHandlingService, loggingService))
  ).subscribe(mainWeatherState => updateSystemState('mainWeather', mainWeatherState));

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
    systemState$: systemState$.asObservable(),
    totalWaterVolume$,
    cleanup: () => cleanup(),
    error$: errorHandlingService.getErrorObservable()
  };
}

function initializeDam(initialData: DamInterface, services: ReturnType<typeof createServicesUtil>, states: ReturnType<typeof createStatesUtil>, totalInflow$: ReturnType<typeof createTotalInflowObservableUtil>, destroy$: Subject<void>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
  try {
    services.damService = createDamService(initialData, totalInflow$);
    if (services.damService) {
      services.damService.getDamState$().pipe(
        takeUntil(destroy$),
        catchError(error => handleError('useWaterSystem.initializeDam', error, errorHandlingService, loggingService))
      ).subscribe(states.damState$);
      services.damService.startSimulation();
      loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: initialData.id });
    } else {
      throw new Error('Failed to create dam service');
    }
  } catch (error) {
    handleError('useWaterSystem.initializeDam', error, errorHandlingService, loggingService);
  }
}

function initializeGlacier(
  initialData: GlacierStateInterface, 
  services: ReturnType<typeof createServicesUtil>, 
  states: ReturnType<typeof createStatesUtil>, 
  addSource: (source: InflowSourceInterface) => void, 
  totalInflow$: ReturnType<typeof createTotalInflowObservableUtil>,
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
  services: ReturnType<typeof createServicesUtil>, 
  states: ReturnType<typeof createStatesUtil>, 
  addSource: (source: InflowSourceInterface) => void, 
  totalInflow$: ReturnType<typeof createTotalInflowObservableUtil>,
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

function initializeMainWeatherStation(id: string, name: string, subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>, services: ReturnType<typeof createServicesUtil>, states: ReturnType<typeof createStatesUtil>, destroy$: Subject<void>, loggingService: WaterSystemDependenciesInterface['loggingService'], errorHandlingService: WaterSystemDependenciesInterface['errorHandlingService']) {
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
