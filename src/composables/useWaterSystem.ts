import { useDam } from '@composables/dam/useDam';
import { useGlacier } from '@composables/glacier/useGlacier';
import { useRiver } from '@composables/river/useRiver';
import { useMainWeatherStation } from '@composables/weather/useMainWeatherStation';
import { errorHandlingService } from '@services/errorHandlingService';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, takeUntil } from 'rxjs/operators';
import { onUnmounted } from 'vue';

export function useWaterSystem() {
  let damSimulation: ReturnType<typeof useDam> | null = null;
  let glacierSimulation: ReturnType<typeof useGlacier> | null = null;
  let riverSimulation: ReturnType<typeof useRiver> | null = null;
  let mainWeatherStation: ReturnType<typeof useMainWeatherStation> | null = null;

  const damState$ = new BehaviorSubject<DamInterface | null>(null);
  const glacierState$ = new BehaviorSubject<GlacierStateInterface | null>(null);
  const riverState$ = new BehaviorSubject<RiverStateInterface | null>(null);
  const mainWeatherState$ = new BehaviorSubject<MainWeatherStationInterface | null>(null);
  const error$ = new Subject<string | null>();

  const destroy$ = new Subject<void>();

  const { addSource, removeSource, aggregatedInflow$ } = createInflowAggregator([]);

  function initializeDam(initialData: DamInterface) {
    damSimulation = useDam(initialData, aggregatedInflow$);
    damSimulation.damState$.pipe(takeUntil(destroy$)).subscribe(damState$);
    damSimulation.startSimulation();

    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: initialData.id });
  }

  function initializeGlacier(initialData: GlacierStateInterface) {
    if (!mainWeatherStation) {
      throw new Error('Main weather station must be initialized before glacier');
    }
    glacierSimulation = useGlacier(initialData, mainWeatherStation.temperature$);
    glacierSimulation.glacierState$.pipe(takeUntil(destroy$)).subscribe(glacierState$);
    const stopSimulation = glacierSimulation.startSimulation();

    addSource({ name: 'Glacier', outflowRate$: glacierSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState);
      }
    }

    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: initialData.id });

    return stopSimulation;
  }

  function initializeRiver(initialData: RiverStateInterface) {
    if (!mainWeatherStation) {
      throw new Error('Main weather station must be initialized before river');
    }
    riverSimulation = useRiver(initialData, mainWeatherStation.precipitation$);
    riverSimulation.riverState$.pipe(takeUntil(destroy$)).subscribe(riverState$);
    const stopSimulation = riverSimulation.startSimulation();

    addSource({ name: 'River', outflowRate$: riverSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState);
      }
    }

    loggingService.info('River simulation initialized', 'useWaterSystem.initializeRiver', { riverId: initialData.id });

    return stopSimulation;
  }

  function initializeMainWeatherStation(
    id: string,
    name: string,
    subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>
  ) {
    mainWeatherStation = useMainWeatherStation(id, name, subStationConfigs);
    mainWeatherState$.next(mainWeatherStation);

    loggingService.info('Main weather station initialized', 'useWaterSystem.initializeMainWeatherStation', { stationId: id });
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
    damSimulation?.cleanup();
    glacierSimulation?.cleanup();
    riverSimulation?.cleanup();
    mainWeatherStation?.subStations.forEach(station => station.cleanup());
    damState$.complete();
    glacierState$.complete();
    riverState$.complete();
    mainWeatherState$.complete();
    error$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
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
