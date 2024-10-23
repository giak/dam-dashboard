import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { SystemStateInterface, WaterSystemDependenciesInterface, WaterSystemInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { handleWaterSystemError } from '@utils/errorHandlerUtil';
import { initializeDam, initializeGlacier, initializeMainWeatherStation, initializeRiver } from '@utils/initializationUtils';
import { calculateTotalWaterVolumeUtil, createServicesUtil, createStatesUtil, createTotalInflowObservableUtil } from '@utils/waterSystemUtils';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs/operators';
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
  const totalInflow$ = createTotalInflowObservableUtil(aggregatedInflow$);
  const destroy$ = new Subject<void>();

  const errorHandler = (context: string, error: any) => 
    handleWaterSystemError(context, error, dependencies.errorHandlingService, dependencies.loggingService);

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
    catchError(error => {
      errorHandler('useWaterSystem.damState$', error);
      return new Observable<DamInterface | null>();
    })
  ).subscribe(damState => updateSystemState('dam', damState));

  states.glacierState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler('useWaterSystem.glacierState$', error);
      return new Observable<GlacierStateInterface | null>();
    })
  ).subscribe(glacierState => updateSystemState('glacier', glacierState));

  states.riverState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler('useWaterSystem.riverState$', error);
      return new Observable<RiverStateInterface | null>();
    })
  ).subscribe(riverState => updateSystemState('river', riverState));

  states.mainWeatherState$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler('useWaterSystem.mainWeatherState$', error);
      return new Observable<MainWeatherStationInterface | null>();
    })
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
    dependencies.loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  };

  onUnmounted(cleanup);

  return {
    initializeDam: (initialData) => initializeDam(initialData, services, states, totalInflow$, destroy$, dependencies),
    initializeGlacier: (initialData) => initializeGlacier(initialData, services, states, addSource, destroy$, dependencies),
    initializeRiver: (initialData) => initializeRiver(initialData, services, states, addSource, destroy$, dependencies),
    initializeMainWeatherStation: (id, name, subStationConfigs) => initializeMainWeatherStation(id, name, subStationConfigs, services, states, destroy$, dependencies),
    systemState$: systemState$.asObservable(),
    totalWaterVolume$,
    cleanup,
    error$: dependencies.errorHandlingService.getErrorObservable()
  };
}
