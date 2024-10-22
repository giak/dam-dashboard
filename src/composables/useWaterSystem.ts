import { useMainWeatherStation } from '@composables/weather/useMainWeatherStation';
import type { WaterSystemDependencies } from '@factories/waterSystemFactory';
import { type DamServiceInterface } from '@services/damService';
import { errorHandlingService } from '@services/errorHandlingService';
import { type GlacierServiceInterface } from '@services/glacierService';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import { type RiverServiceInterface } from '@services/riverService';
import { type WeatherServiceInterface } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, takeUntil } from 'rxjs/operators';
import { onUnmounted } from 'vue';

export function useWaterSystem(dependencies: WaterSystemDependencies): WaterSystemInterface {
  const {
    createDamService,
    createGlacierService,
    createRiverService,
    createWeatherService
  } = dependencies;

  let damService: DamServiceInterface | null = null;
  let glacierService: GlacierServiceInterface | null = null;
  let riverService: RiverServiceInterface | null = null;
  let mainWeatherStation: ReturnType<typeof useMainWeatherStation> | null = null;
  let weatherService: WeatherServiceInterface | null = null;

  const damState$ = new BehaviorSubject<DamInterface | null>(null);
  const glacierState$ = new BehaviorSubject<GlacierStateInterface | null>(null);
  const riverState$ = new BehaviorSubject<RiverStateInterface | null>(null);
  const mainWeatherState$ = new BehaviorSubject<MainWeatherStationInterface | null>(null);
  const error$ = new Subject<string | null>();

  const destroy$ = new Subject<void>();

  const { addSource, removeSource, aggregatedInflow$ } = createInflowAggregator([]);

  // Créer un Observable qui n'émet que le totalInflow
  const totalInflow$ = aggregatedInflow$.pipe(
    map(aggregatedInflow => aggregatedInflow.totalInflow)
  );

  function initializeDam(initialData: DamInterface) {
    damService = createDamService(initialData, totalInflow$);
    if (damService) {
      damService.getDamState$().pipe(takeUntil(destroy$)).subscribe(damState$);
      damService.startSimulation();
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

  function initializeGlacier(initialData: GlacierStateInterface) {
    if (!weatherService) {
      throw new Error('Main weather station must be initialized before glacier');
    }
    glacierService = createGlacierService(initialData, weatherService.getTemperature$());
    if (glacierService) {
      glacierService.getGlacierState$().pipe(takeUntil(destroy$)).subscribe(glacierState$);
      const stopSimulation = glacierService.startSimulation();
      addSource({ name: 'Glacier', outflowRate$: glacierService.getOutflowRate$() });
      if (damService) {
        // Réinitialiser le barrage avec la nouvelle source d'eau
        const currentDamState = damState$.getValue();
        if (currentDamState) {
          initializeDam(currentDamState);
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

  function initializeRiver(initialData: RiverStateInterface) {
    if (!weatherService) {
      throw new Error('Main weather station must be initialized before river');
    }
    riverService = createRiverService(initialData, weatherService.getPrecipitation$());
    if (riverService) {
      riverService.getRiverState$().pipe(takeUntil(destroy$)).subscribe(riverState$);
      const stopSimulation = riverService.startSimulation();
      addSource({ name: 'River', outflowRate$: riverService.getOutflowRate$() });
      if (damService) {
        // Réinitialiser le barrage avec la nouvelle source d'eau
        const currentDamState = damState$.getValue();
        if (currentDamState) {
          initializeDam(currentDamState);
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

  function initializeMainWeatherStation(
    id: string,
    name: string,
    subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>
  ) {
    weatherService = createWeatherService(id, name, subStationConfigs);
    if (weatherService) {
      weatherService.getMainWeatherState$().pipe(takeUntil(destroy$)).subscribe(mainWeatherState$);
      weatherService.startSimulation();
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

  const systemState$ = combineLatest([
    damState$,
    glacierState$,
    riverState$,
    mainWeatherState$
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

  const totalWaterVolume$ = combineLatest([damState$, riverState$]).pipe(
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

  function cleanup() {
    destroy$.next();
    destroy$.complete();
    damService?.cleanup();
    glacierService?.cleanup();
    riverService?.cleanup();
    mainWeatherStation?.subStations.forEach(station => station.cleanup());
    damState$.complete();
    glacierState$.complete();
    riverState$.complete();
    mainWeatherState$.complete();
    error$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
    weatherService?.cleanup();
  }

  onUnmounted(cleanup);

  return {
    initializeDam,
    initializeGlacier,
    initializeRiver,
    initializeMainWeatherStation,
    systemState$,
    totalWaterVolume$,
    cleanup,
    error$
  };
}
