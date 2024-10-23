import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { updateDamState, validateDamUpdate } from '@utils/dam/damUtils';
import {
  asyncScheduler,
  BehaviorSubject,
  EMPTY,
  Observable,
  queueScheduler,
  Subject,
  timer
} from 'rxjs';
import {
  bufferTime,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  observeOn,
  retry,
  shareReplay,
  takeUntil,
  tap
} from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

export interface DamServiceInterface {
  getDamState$: () => Observable<DamInterface>;
  getCurrentWaterLevel$: () => Observable<number>;
  updateDam: (update: DamUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamService(
  initialData: DamInterface, 
  aggregatedInflow$: Observable<number>
): DamServiceInterface {
  const destroy$ = new Subject<void>();
  // Utiliser BehaviorSubject au lieu de ReplaySubject
  const damState$ = new BehaviorSubject<DamInterface>(initialData);

  // Optimisation : Flux d'état partagé avec scheduler et gestion d'erreurs
  const sharedDamState$ = damState$.pipe(
    observeOn(asyncScheduler),
    debounceTime(100), // Évite les mises à jour trop fréquentes
    distinctUntilChanged((prev, curr) => 
      prev.currentWaterLevel === curr.currentWaterLevel &&
      prev.inflowRate === curr.inflowRate &&
      prev.outflowRate === curr.outflowRate
    ),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Dam state stream finalized', 'DamService');
    }),
    catchError(error => {
      loggingService.error('Error in dam state stream', 'DamService', { error });
      return EMPTY;
    }),
    shareReplay(1)
  );

  // Optimisation : Flux de niveau d'eau avec scheduler
  const currentWaterLevel$ = sharedDamState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Water level stream finalized', 'DamService');
    }),
    shareReplay(1)
  );

  const updateDam = (update: DamUpdateInterface): void => {
    queueScheduler.schedule(() => {
      try {
        validateDamUpdate(update);
        const currentState = damState$.getValue();
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        damState$.next(newState);
        
        asyncScheduler.schedule(() => {
          loggingService.info('Dam state updated', 'DamService', { newState });
        }, 0, { priority: -1 });
      } catch (error) {
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating dam state',
            timestamp: Date.now(),
            context: 'DamService.updateDam',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    // Optimisation du flux d'entrée avec scheduler et gestion d'erreurs
    const simulation$ = aggregatedInflow$.pipe(
      observeOn(asyncScheduler),
      bufferTime(100, undefined, 5), // Buffer max 5 items sur 100ms
      filter(updates => updates.length > 0),
      map(updates => updates[updates.length - 1]),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          loggingService.error('Simulation error, retrying...', 'DamService', { 
            error, 
            retryCount 
          });
          return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
        }
      }),
      tap(inflow => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing inflow update', 'DamService', { inflow });
        }, 0, { priority: -1 });
      }),
      takeUntil(destroy$),
      finalize(() => {
        loggingService.info('Simulation stream finalized', 'DamService');
      }),
      catchError(error => {
        loggingService.error('Max retries reached', 'DamService', { error });
        return EMPTY;
      }),
      shareReplay(1)
    );

    const subscription = simulation$.subscribe(inflow => {
      queueScheduler.schedule(() => {
        const currentState = damState$.getValue();
        const newState = updateDamState(currentState, 1000, inflow as number);
        damState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    destroy$.next();
    destroy$.complete();
    damState$.complete();
    loggingService.info('Dam service cleaned up', 'DamService');
  };

  return {
    getDamState$: () => sharedDamState$,
    getCurrentWaterLevel$: () => currentWaterLevel$,
    updateDam,
    startSimulation,
    cleanup
  };
}
