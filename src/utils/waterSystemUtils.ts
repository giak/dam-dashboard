import type { DamServiceInterface } from '@services/damService';
import type { GlacierServiceInterface } from '@services/glacierService';
import type { RiverServiceInterface } from '@services/riverService';
import type { WeatherServiceInterface } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import type { SystemStateInterface } from '@type/waterSystem';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';

export function createServicesUtil() {
  return {
    damService: null as DamServiceInterface | null,
    glacierService: null as GlacierServiceInterface | null,
    riverService: null as RiverServiceInterface | null,
    weatherService: null as WeatherServiceInterface | null
  };
}

export function createStatesUtil() {
  return {
    damState$: new BehaviorSubject<DamInterface | null>(null),
    glacierState$: new BehaviorSubject<GlacierStateInterface | null>(null),
    riverState$: new BehaviorSubject<RiverStateInterface | null>(null),
    mainWeatherState$: new BehaviorSubject<MainWeatherStationInterface | null>(null)
  };
}

export function createTotalInflowObservableUtil(aggregatedInflow$: Observable<{ totalInflow: number }>) {
  return aggregatedInflow$.pipe(
    map(aggregatedInflow => aggregatedInflow.totalInflow)
  );
}

export function calculateTotalWaterVolumeUtil(dam: DamInterface | null, river: RiverStateInterface | null): number {
  if (!dam || !river) return 0;
  return dam.currentWaterLevel * dam.maxCapacity + river.waterVolume;
}

export function updateSystemState(
  systemState$: BehaviorSubject<SystemStateInterface>,
  key: keyof SystemStateInterface,
  value: any
) {
  const currentState = systemState$.getValue();
  if (currentState[key] !== value) {
    systemState$.next({ ...currentState, [key]: value });
  }
}

export function subscribeToState<T>(
  state$: Observable<T | null>,
  key: keyof SystemStateInterface,
  systemState$: BehaviorSubject<SystemStateInterface>,
  destroy$: Subject<void>,
  errorHandler: (context: string, error: any) => void
) {
  return state$.pipe(
    takeUntil(destroy$),
    distinctUntilChanged(),
    catchError(error => {
      errorHandler(`useWaterSystem.${key}State$`, error);
      return new Observable<T | null>();
    })
  ).subscribe(state => updateSystemState(systemState$, key, state));
}
