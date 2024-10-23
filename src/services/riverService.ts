import type { RiverStateInterface, RiverUpdateInterface } from '@type/river/RiverInterface';
import { updateRiverState } from '@utils/river/riverUtils';
import { 
  BehaviorSubject, 
  Observable, 
  asyncScheduler,
  queueScheduler,
  Subject,
  timer,
  EMPTY,
  interval
} from 'rxjs';
import { 
  map, 
  observeOn, 
  shareReplay, 
  tap, 
  withLatestFrom,
  distinctUntilChanged,
  takeUntil,
  finalize,
  retry,
  catchError,
  debounceTime
} from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

// Constantes pour la simulation
const SIMULATION_INTERVAL = 1000; // 1 seconde en millisecondes
const BASE_FLOW_RATE = 10; // Débit de base en m³/s
const PRECIPITATION_IMPACT_FACTOR = 0.5; // Facteur d'impact des précipitations

export interface RiverServiceInterface {
  getRiverState$: () => Observable<RiverStateInterface>;
  getOutflowRate$: () => Observable<number>;
  updateRiver: (update: RiverUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createRiverService(
  initialData: RiverStateInterface, 
  precipitation$: Observable<number>
): RiverServiceInterface {
  const destroy$ = new Subject<void>();
  const riverState$ = new BehaviorSubject<RiverStateInterface>(initialData);
  
  // Optimisation : Flux partagé avec distinctUntilChanged et scheduler
  const sharedRiverState$ = riverState$.pipe(
    observeOn(asyncScheduler),
    debounceTime(100), // Évite les mises à jour trop fréquentes
    distinctUntilChanged((prev, curr) => 
      prev.flowRate === curr.flowRate && 
      prev.waterVolume === curr.waterVolume
    ),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('River state stream finalized', 'RiverService');
    }),
    catchError(error => {
      loggingService.error('Error in river state stream', 'RiverService', { error });
      return EMPTY;
    }),
    shareReplay(1)
  );

  // Optimisation : Flux de débit avec scheduler
  const outflowRate$ = sharedRiverState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.flowRate),
    distinctUntilChanged(),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Outflow rate stream finalized', 'RiverService');
    }),
    shareReplay(1)
  );

  const updateRiver = (update: RiverUpdateInterface): void => {
    queueScheduler.schedule(() => {
      try {
        const currentState = riverState$.getValue();
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        riverState$.next(newState);
        
        asyncScheduler.schedule(() => {
          loggingService.info('River state updated', 'RiverService', { newState });
        }, 0, { priority: -1 });
      } catch (error) {
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating river state',
            timestamp: Date.now(),
            context: 'RiverService.updateRiver',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation as number),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          loggingService.error('Simulation error, retrying...', 'RiverService', { 
            error, 
            retryCount 
          });
          return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
        }
      }),
      tap(precipitation => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing precipitation', 'RiverService', { precipitation });
        }, 0, { priority: -1 });
      }),
      takeUntil(destroy$),
      finalize(() => {
        loggingService.info('Simulation stream finalized', 'RiverService');
      }),
      shareReplay(1)
    );

    const subscription = simulation$.subscribe(precipitation => {
      queueScheduler.schedule(() => {
        const currentState = riverState$.getValue();
        const newState = updateRiverState(
          currentState,
          precipitation,
          SIMULATION_INTERVAL / 1000,
          BASE_FLOW_RATE,
          PRECIPITATION_IMPACT_FACTOR
        );
        riverState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    destroy$.next();
    destroy$.complete();
    riverState$.complete();
    loggingService.info('River service cleaned up', 'RiverService');
  };

  return {
    getRiverState$: () => sharedRiverState$,
    getOutflowRate$: () => outflowRate$,
    updateRiver,
    startSimulation,
    cleanup
  };
}
