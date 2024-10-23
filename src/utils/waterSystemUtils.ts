import type { DamServiceInterface } from '@services/damService';
import type { GlacierServiceInterface } from '@services/glacierService';
import { loggingService } from '@services/loggingService';
import type { RiverServiceInterface } from '@services/riverService';
import type { WeatherServiceInterface } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { SystemStateInterface } from '@type/waterSystem';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  asyncScheduler,
  timer
} from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  observeOn,
  retry,
  shareReplay,
  takeUntil,
  tap
} from 'rxjs/operators';

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
    observeOn(asyncScheduler),
    debounceTime(100),
    map(aggregatedInflow => aggregatedInflow.totalInflow),
    distinctUntilChanged(),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        loggingService.error('Inflow calculation error, retrying...', 'waterSystemUtils', { 
          error, 
          retryCount 
        });
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    catchError(error => {
      loggingService.error('Error calculating total inflow', 'waterSystemUtils', { error });
      return EMPTY;
    }),
    shareReplay(1)
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
  asyncScheduler.schedule(() => {
    const currentState = systemState$.getValue();
    if (currentState[key] !== value) {
      systemState$.next({ ...currentState, [key]: value });
      
      // Logging asynchrone
      asyncScheduler.schedule(() => {
        loggingService.info('System state updated', 'waterSystemUtils', { 
          key, 
          value 
        });
      }, 0, { priority: -1 });
    }
  });
}

export function subscribeToState<T>(
  state$: Observable<T | null>,
  key: keyof SystemStateInterface,
  systemState$: BehaviorSubject<SystemStateInterface>,
  destroy$: Subject<void>,
  errorHandler: (context: string, error: any) => void
) {
  return state$.pipe(
    observeOn(asyncScheduler),
    debounceTime(100),
    distinctUntilChanged(),
    tap(state => {
      asyncScheduler.schedule(() => {
        loggingService.info('State update received', 'waterSystemUtils', { 
          key, 
          state 
        });
      }, 0, { priority: -1 });
    }),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        errorHandler(`State subscription error, retrying... (${key})`, error);
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info(`State subscription finalized for ${key}`, 'waterSystemUtils');
    }),
    catchError(error => {
      errorHandler(`useWaterSystem.${key}State$`, error);
      return EMPTY;
    })
  ).subscribe(state => updateSystemState(systemState$, key, state));
}
