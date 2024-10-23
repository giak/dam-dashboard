import type { GlacierStateInterface, GlacierUpdateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import {
  asyncScheduler,
  BehaviorSubject,
  distinctUntilChanged,
  EMPTY,
  interval,
  Observable,
  queueScheduler,
  Subject,
  timer
} from 'rxjs';
import {
  bufferTime,
  catchError,
  debounceTime,
  filter,
  finalize,
  map,
  observeOn,
  retry,
  shareReplay,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

// Constantes pour la simulation
const SIMULATION_INTERVAL = 1000; // 1 seconde en millisecondes
const BASE_MELT_RATE = 0.1; // Taux de fonte de base en m³/s
const TEMPERATURE_IMPACT_FACTOR = 0.05; // Facteur d'impact de la température

export interface GlacierServiceInterface {
  getGlacierState$: () => Observable<GlacierStateInterface>;
  getOutflowRate$: () => Observable<number>;
  updateGlacier: (update: GlacierUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createGlacierService(
  initialData: GlacierStateInterface, 
  temperature$: Observable<number>
): GlacierServiceInterface {
  const destroy$ = new Subject<void>();
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialData);

  // Optimisation : Flux d'état partagé avec scheduler et gestion d'erreurs
  const sharedGlacierState$ = glacierState$.pipe(
    observeOn(asyncScheduler),
    debounceTime(100),
    distinctUntilChanged((prev, curr) => 
      prev.volume === curr.volume &&
      prev.outflowRate === curr.outflowRate
    ),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Glacier state stream finalized', 'GlacierService');
    }),
    catchError(error => {
      loggingService.error('Error in glacier state stream', 'GlacierService', { error });
      return EMPTY;
    }),
    shareReplay(1)
  );

  // Optimisation : Flux de débit avec scheduler
  const outflowRate$ = sharedGlacierState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.outflowRate),
    distinctUntilChanged(),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Outflow rate stream finalized', 'GlacierService');
    }),
    shareReplay(1)
  );

  const updateGlacier = (update: GlacierUpdateInterface): void => {
    // Utilisation de queueScheduler pour les calculs intensifs
    queueScheduler.schedule(() => {
      try {
        const currentState = glacierState$.value;
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        glacierState$.next(newState);
        
        // Logging asynchrone avec priorité basse
        asyncScheduler.schedule(() => {
          loggingService.info('Glacier state updated', 'GlacierService', { newState });
        }, 0, { priority: -1 });
      } catch (error) {
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating glacier state',
            timestamp: Date.now(),
            context: 'GlacierService.updateGlacier',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    // Optimisation du flux de simulation avec scheduler et gestion d'erreurs
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(temperature$),
      map(([, temperature]) => temperature),
      bufferTime(100, undefined, 5),
      filter((updates): updates is number[] => updates.length > 0),
      map(updates => updates[updates.length - 1]),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          loggingService.error('Simulation error, retrying...', 'GlacierService', { 
            error, 
            retryCount 
          });
          return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
        }
      }),
      tap(temperature => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing temperature update', 'GlacierService', { temperature });
        }, 0, { priority: -1 });
      }),
      takeUntil(destroy$),
      finalize(() => {
        loggingService.info('Simulation stream finalized', 'GlacierService');
      }),
      catchError(error => {
        loggingService.error('Max retries reached', 'GlacierService', { error });
        return EMPTY;
      }),
      shareReplay(1)
    ) as Observable<number>;

    const subscription = simulation$.subscribe((temperature: number) => {
      queueScheduler.schedule(() => {
        const currentState = glacierState$.value;
        const newState = updateGlacierState(
          currentState,
          temperature,
          SIMULATION_INTERVAL / 1000,
          BASE_MELT_RATE,
          TEMPERATURE_IMPACT_FACTOR
        );
        glacierState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    destroy$.next();
    destroy$.complete();
    glacierState$.complete();
    loggingService.info('Glacier service cleaned up', 'GlacierService');
  };

  return {
    getGlacierState$: () => sharedGlacierState$,
    getOutflowRate$: () => outflowRate$,
    updateGlacier,
    startSimulation,
    cleanup
  };
}
