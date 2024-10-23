import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { SystemStateInterface, WaterSystemDependenciesInterface, WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { handleWaterSystemError } from '@utils/errorHandlerUtil';
import { initializeDam, initializeGlacier, initializeMainWeatherStation, initializeRiver } from '@utils/initializationUtils';
import { calculateTotalWaterVolumeUtil, createServicesUtil, createStatesUtil, createTotalInflowObservableUtil, subscribeToState } from '@utils/waterSystemUtils';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay } from 'rxjs/operators';
import { onUnmounted } from 'vue';

export function createSystemStateObservable(
  damState$: Observable<DamInterface | null>,
  glacierState$: Observable<GlacierStateInterface | null>,
  riverState$: Observable<RiverStateInterface | null>,
  mainWeatherState$: Observable<MainWeatherStationInterface | null>,
  errorHandler: (context: string, error: any) => void
): Observable<SystemStateInterface> {
  return combineLatest([damState$, glacierState$, riverState$, mainWeatherState$]).pipe(
    map(([dam, glacier, river, mainWeather]) => ({ dam, glacier, river, mainWeather })),
    catchError(error => {
      errorHandler('useWaterSystem.systemState$', error);
      return new Observable<SystemStateInterface>();
    }),
    shareReplay(1)
  );
}

export function createTotalWaterVolumeObservable(
  damState$: Observable<DamInterface | null>,
  riverState$: Observable<RiverStateInterface | null>,
  errorHandler: (context: string, error: any) => void
): Observable<number> {
  return combineLatest([damState$, riverState$]).pipe(
    map(([dam, river]) => calculateTotalWaterVolumeUtil(dam, river)),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler('useWaterSystem.totalWaterVolume$', error);
      return new Observable<number>();
    }),
    shareReplay(1)
  );
}

export function useWaterSystem(dependencies: WaterSystemDependenciesInterface): WaterSystemInterface {
  const services = createServicesUtil();
  const states = createStatesUtil();
  const { addSource, aggregatedInflow$ } = dependencies.createInflowAggregator([]);
  const totalInflow$ = createTotalInflowObservableUtil(aggregatedInflow$).pipe(shareReplay(1));
  const destroy$ = new Subject<void>();

  const errorHandler = (context: string, error: any) => 
    handleWaterSystemError(context, error, dependencies.errorHandlingService, dependencies.loggingService);

  const systemState$ = new BehaviorSubject<SystemStateInterface>({
    dam: null,
    glacier: null,
    river: null,
    mainWeather: null
  });

  // Mémoïsation du calcul du volume total d'eau
  const memoizedCalculateTotalWaterVolume = (() => {
    let lastDam: DamInterface | null = null;
    let lastRiver: RiverStateInterface | null = null;
    let lastResult: number | null = null;

    return (dam: DamInterface | null, river: RiverStateInterface | null) => {
      if (dam === lastDam && river === lastRiver && lastResult !== null) {
        return lastResult;
      }
      lastDam = dam;
      lastRiver = river;
      lastResult = calculateTotalWaterVolumeUtil(dam, river);
      return lastResult;
    };
  })();

  const totalWaterVolume$ = combineLatest([states.damState$, states.riverState$]).pipe(
    map(([dam, river]) => memoizedCalculateTotalWaterVolume(dam, river)),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler('useWaterSystem.totalWaterVolume$', error);
      return new Observable<number>();
    }),
    shareReplay(1)
  );

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
    initializeMainWeatherStation: (id, name, subStationConfigs) => initializeMainWeatherStation(id, name, subStationConfigs, services, states, destroy$, dependencies),
    systemState$: systemState$.asObservable().pipe(shareReplay(1)),
    totalWaterVolume$,
    cleanup,
    error$: dependencies.errorHandlingService.getErrorObservable().pipe(shareReplay(1))
  };
}
