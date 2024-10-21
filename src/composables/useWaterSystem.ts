import { useDam } from '@composables/dam/useDam';
import { useGlacier } from '@composables/glacier/useGlacier';
import { useRiver } from '@composables/river/useRiver';
import { useMainWeatherStation } from '@composables/weather/useMainWeatherStation';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, combineLatest, Observable, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { watch } from 'vue';

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

  const { addSource, removeSource, aggregatedInflow$ } = createInflowAggregator([]);

  function initializeDam(initialData: DamInterface) {
    damSimulation = useDam(initialData, aggregatedInflow$);
    damSimulation.damState$.subscribe(damState$);
    damSimulation.startSimulation();

    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: initialData.id });
  }

  function initializeGlacier(initialData: GlacierStateInterface) {
    if (!mainWeatherStation) {
      throw new Error('Main weather station must be initialized before glacier');
    }
    glacierSimulation = useGlacier(initialData, mainWeatherStation.temperature$);
    const glacierStateObservable = new Observable<GlacierStateInterface>(observer => {
      if (glacierSimulation) {
        // Emit the initial value
        observer.next({
          ...glacierSimulation.glacierState.value,
          elevation: initialData.elevation,
          area: initialData.area,
          temperature: initialData.temperature,
          flow: initialData.flow
        });
        
        // Use watch to observe changes
        const unwatch = watch(glacierSimulation.glacierState, (newValue) => {
          observer.next({
            ...newValue,
            elevation: initialData.elevation,
            area: initialData.area,
            temperature: initialData.temperature,
            flow: initialData.flow
          });
        }, { deep: true });

        // Return a cleanup function
        return () => {
          unwatch();
        };
      }
      return () => {};
    });
    glacierStateObservable.subscribe(glacierState$);
    glacierSimulation.startSimulation();

    addSource({ name: 'Glacier', outflowRate$: glacierSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState);
      }
    }

    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: initialData.id });
  }

  function initializeRiver(initialData: RiverStateInterface) {
    if (!mainWeatherStation) {
      throw new Error('Main weather station must be initialized before river');
    }
    riverSimulation = useRiver(initialData, mainWeatherStation.precipitation$);
    const riverStateObservable = new Observable<RiverStateInterface>(observer => {
      if (riverSimulation) {
        // Émettre la valeur initiale
        observer.next(riverSimulation.riverState.value);
        
        // Utiliser watch pour observer les changements
        const unwatch = watch(riverSimulation.riverState, (newValue) => {
          observer.next(newValue);
        }, { deep: true });

        // Retourner une fonction de nettoyage
        return () => {
          unwatch();
        };
      }
      return () => {};
    });
    riverStateObservable.subscribe(riverState$);
    riverSimulation.startSimulation();

    addSource({ name: 'River', outflowRate$: riverSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      const currentDamState = damState$.getValue();
      if (currentDamState) {
        initializeDam(currentDamState);
      }
    }

    loggingService.info('River simulation initialized', 'useWaterSystem.initializeRiver', { riverId: initialData.id });
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
      error$.next(`Error in system state: ${err.message}`);
      return of({ dam: null, glacier: null, river: null, mainWeather: null });
    }),
    shareReplay(1)
  );

  const totalWaterLevel$ = damState$.pipe(
    switchMap(damState => 
      damState ? of(damState.currentWaterLevel) : of(0)
    ),
    catchError(err => {
      loggingService.error('Error in total water level', 'useWaterSystem.totalWaterLevel$', { error: err });
      error$.next(`Error in total water level: ${err.message}`);
      return of(0);
    }),
    shareReplay(1)
  );

  function cleanup() {
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

  return {
    initializeDam,
    initializeGlacier,
    initializeRiver,
    initializeMainWeatherStation,
    systemState$,
    totalWaterLevel$,
    cleanup,
    error$
  };
}
