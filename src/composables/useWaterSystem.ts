import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverInterface';
import type { SystemStateInterface, WaterSystemDependenciesInterface, WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { handleWaterSystemError } from '@utils/errorHandlerUtil';
import { initializeDam, initializeGlacier, initializeMainWeatherStation, initializeRiver } from '@utils/initializationUtils';
import { calculateTotalWaterVolumeUtil, createServicesUtil, createStatesUtil, createTotalInflowObservableUtil, subscribeToState } from '@utils/waterSystemUtils';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  asyncScheduler,
  combineLatest,
  queueScheduler,
  timer
} from 'rxjs';
import {
  bufferTime,
  catchError,
  distinctUntilChanged,
  filter,
  map,
  observeOn,
  retry,
  shareReplay
} from 'rxjs/operators';
import { onUnmounted } from 'vue';

export function createSystemStateObservable(
  damState$: Observable<DamInterface | null>,
  glacierState$: Observable<GlacierStateInterface | null>,
  riverState$: Observable<RiverStateInterface | null>,
  mainWeatherState$: Observable<MainWeatherStationInterface | null>,
  errorHandler: (context: string, error: any) => void
): Observable<SystemStateInterface> {
  return combineLatest([damState$, glacierState$, riverState$, mainWeatherState$]).pipe(
    observeOn(queueScheduler), // Utilisation de queueScheduler pour les calculs intensifs
    bufferTime(100, undefined, 5), // Buffer max 5 items sur 100ms
    filter(updates => updates.length > 0),
    map(updates => updates[updates.length - 1]),
    map(([dam, glacier, river, mainWeather]) => ({ dam, glacier, river, mainWeather })),
    distinctUntilChanged((prev, curr) => 
      prev.dam?.currentWaterLevel === curr.dam?.currentWaterLevel &&
      prev.glacier?.volume === curr.glacier?.volume &&
      prev.river?.waterVolume === curr.river?.waterVolume
    ),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        errorHandler('System state error, retrying...', error);
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    catchError(error => {
      errorHandler('useWaterSystem.systemState$', error);
      return EMPTY;
    }),
    shareReplay(1)
  );
}

export function useWaterSystem(dependencies: WaterSystemDependenciesInterface): WaterSystemInterface {
  const services = createServicesUtil();
  const states = createStatesUtil();
  const destroy$ = new Subject<void>();
  
  const { addSource, aggregatedInflow$ } = dependencies.createInflowAggregator([]);
  const totalInflow$ = createTotalInflowObservableUtil(aggregatedInflow$).pipe(
    observeOn(asyncScheduler),
    shareReplay(1)
  );

  const errorHandler = (context: string, error: any) => 
    handleWaterSystemError(context, error, dependencies.errorHandlingService, dependencies.loggingService);

  // Utilisation de BehaviorSubject au lieu de ReplaySubject
  const systemState$ = new BehaviorSubject<SystemStateInterface>({
    dam: null,
    glacier: null,
    river: null,
    mainWeather: null
  });

  // Mémoïsation optimisée avec queueScheduler
  const memoizedCalculateTotalWaterVolume = (() => {
    let lastDam: DamInterface | null = null;
    let lastRiver: RiverStateInterface | null = null;
    let lastResult: number | null = null;

    return (dam: DamInterface | null, river: RiverStateInterface | null): number => {
      if (dam === lastDam && river === lastRiver && lastResult !== null) {
        return lastResult;
      }
      lastDam = dam;
      lastRiver = river;
      
      lastResult = calculateTotalWaterVolumeUtil(dam, river);
      return lastResult;
    };
  })();

  // Optimisation du flux de volume total
  const totalWaterVolume$ = combineLatest([states.damState$, states.riverState$]).pipe(
    observeOn(queueScheduler),
    bufferTime(100, undefined, 5),
    filter(updates => updates.length > 0),
    map(updates => updates[updates.length - 1]),
    map(([dam, river]) => memoizedCalculateTotalWaterVolume(dam, river)),
    distinctUntilChanged(),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        errorHandler('Total water volume error, retrying...', error);
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    catchError(error => {
      errorHandler('useWaterSystem.totalWaterVolume$', error);
      return EMPTY;
    }),
    shareReplay(1)
  );

  // Optimisation des souscriptions d'état
  subscribeToState(states.damState$, 'dam', systemState$, destroy$, errorHandler);
  subscribeToState(states.glacierState$, 'glacier', systemState$, destroy$, errorHandler);
  subscribeToState(states.riverState$, 'river', systemState$, destroy$, errorHandler);
  subscribeToState(states.mainWeatherState$, 'mainWeather', systemState$, destroy$, errorHandler);

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
    dependencies.loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  };

  onUnmounted(cleanup);

  return {
    initializeDam: (initialData) => initializeDam(initialData, services, states, totalInflow$, destroy$, dependencies),
    initializeGlacier: (initialData) => initializeGlacier(initialData, services, states, addSource, destroy$, dependencies),
    initializeRiver: (initialData) => initializeRiver(initialData, services, states, addSource, destroy$, dependencies),
    initializeMainWeatherStation: (id, name, subStationConfigs) => 
      initializeMainWeatherStation(id, name, subStationConfigs, services, states, destroy$, dependencies),
    systemState$: systemState$.asObservable().pipe(
      observeOn(asyncScheduler),
      shareReplay(1)
    ),
    totalWaterVolume$,
    cleanup,
    error$: dependencies.errorHandlingService.getErrorObservable().pipe(
      observeOn(asyncScheduler),
      shareReplay(1)
    )
  };
}
