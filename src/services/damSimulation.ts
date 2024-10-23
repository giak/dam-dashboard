import type { DamInterface } from '@type/dam/DamInterface';
import { asyncScheduler, BehaviorSubject, EMPTY, interval, Observable, queueScheduler, Subject, timer } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  observeOn,
  retry,
  share,
  shareReplay,
  takeUntil,
  tap
} from 'rxjs/operators';
import { loggingService } from "./loggingService";

export interface DamSimulationInterface {
  damState$: Observable<DamInterface>;
  currentWaterLevel$: Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamSimulation(initialState: DamInterface): DamSimulationInterface {
  const destroy$ = new Subject<void>();
  const damState = new BehaviorSubject<DamInterface>(initialState);
  const currentWaterLevel = new BehaviorSubject<number>(initialState.currentWaterLevel);

  // Optimisation : Flux d'état partagé avec scheduler et gestion d'erreurs
  const sharedDamState$ = damState.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.currentWaterLevel === curr.currentWaterLevel &&
      prev.inflowRate === curr.inflowRate &&
      prev.outflowRate === curr.outflowRate
    ),
    catchError(error => {
      loggingService.error('Error in dam state stream', 'DamSimulation', { error });
      return new Observable<DamInterface>();
    }),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Dam state stream finalized', 'DamSimulation');
    }),
    shareReplay(1)
  );

  // Optimisation : Flux de niveau d'eau avec scheduler et gestion d'erreurs
  const sharedWaterLevel$ = currentWaterLevel.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    catchError(error => {
      loggingService.error('Error in water level stream', 'DamSimulation', { error });
      return new Observable<number>();
    }),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Water level stream finalized', 'DamSimulation');
    }),
    shareReplay(1)
  );

  const updateWaterLevel = () => {
    // Utilisation de queueScheduler pour les calculs intensifs
    queueScheduler.schedule(() => {
      try {
        const currentState = damState.value;
        
        // Validation et calculs déplacés dans queueScheduler
        if (!validateDamState(currentState)) {
          throw new Error('Invalid dam state');
        }

        const { newWaterLevel, newInflowRate, newOutflowRate } = calculateNewDamState(currentState);

        // Mise à jour d'état via asyncScheduler
        asyncScheduler.schedule(() => {
          currentWaterLevel.next(newWaterLevel);
          damState.next({
            ...currentState,
            currentWaterLevel: newWaterLevel,
            inflowRate: newInflowRate,
            outflowRate: newOutflowRate,
            lastUpdated: new Date()
          });
        });

      } catch (error) {
        loggingService.error('Error updating water level', 'DamSimulation', { error });
      }
    });
  };

  const startSimulation = () => {
    const simulation$ = interval(1000, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      tap(() => {
        loggingService.info('Processing simulation update', 'DamSimulation');
      }),
      retry({
        delay: (error, retryCount) => {
          loggingService.error('Simulation error, retrying...', 'DamSimulation', { 
            error, 
            retryCount 
          });
          return timer(Math.min(1000 * Math.pow(2, retryCount), 10000)); // Backoff exponentiel plafonné à 10s
        },
        count: 3 // Nombre maximum de tentatives
      }),
      takeUntil(destroy$),
      finalize(() => {
        loggingService.info('Simulation stream finalized', 'DamSimulation');
      }),
      catchError(error => {
        loggingService.error('Max retries reached', 'DamSimulation', { error });
        return EMPTY;
      }),
      share()
    );

    const subscription = simulation$.subscribe(updateWaterLevel);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    destroy$.next();
    destroy$.complete();
    damState.complete();
    currentWaterLevel.complete();
  };

  return {
    damState$: sharedDamState$,
    currentWaterLevel$: sharedWaterLevel$,
    startSimulation,
    cleanup
  };
}

// Fonctions utilitaires
function validateDamState(state: DamInterface): boolean {
  return (
    typeof state.currentWaterLevel === 'number' && 
    !isNaN(state.currentWaterLevel) &&
    typeof state.maxWaterLevel === 'number' && 
    !isNaN(state.maxWaterLevel)
  );
}

function calculateNewDamState(currentState: DamInterface) {
  const inflowChange = (Math.random() - 0.5) * 2;
  const outflowChange = (Math.random() - 0.5) * 2;

  const newInflowRate = Math.max(0, currentState.inflowRate + inflowChange);
  const newOutflowRate = Math.max(0, currentState.outflowRate + outflowChange);
  const netChange = (newInflowRate - newOutflowRate) / 100;

  const newWaterLevel = Math.max(
    currentState.minWaterLevel,
    Math.min(currentState.currentWaterLevel + netChange, currentState.maxWaterLevel)
  );

  return { newWaterLevel, newInflowRate, newOutflowRate };
}
