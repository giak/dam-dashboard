import type { RiverStateInterface } from '@type/river/RiverInterface';
import { updateRiverState } from '@utils/river/riverUtils';
import { 
  asyncScheduler, 
  queueScheduler,
  BehaviorSubject, 
  interval, 
  Observable, 
  Subject,
  timer,
  EMPTY
} from 'rxjs';
import { 
  distinctUntilKeyChanged,
  distinctUntilChanged,
  map, 
  observeOn, 
  share, 
  tap, 
  withLatestFrom,
  takeUntil,
  finalize,
  retry,
  catchError,
  debounceTime
} from 'rxjs/operators';
import { loggingService } from "./loggingService";

export interface RiverSimulationInterface {
  riverState$: Observable<RiverStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
  updateState: (precipitationMm: number) => void;
}

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_FLOW_RATE = 10; // Base flow rate in m³/s
const PRECIPITATION_IMPACT_FACTOR = 0.5; // How much precipitation affects flow rate

export function createRiverSimulation(
  initialState: RiverStateInterface,
  precipitation$: Observable<number>
): RiverSimulationInterface {
  const destroy$ = new Subject<void>();
  const riverState = new BehaviorSubject<RiverStateInterface>(initialState);
  const outflowRate = new BehaviorSubject<number>(initialState.flowRate);

  // Optimisation : Flux d'état avec gestion améliorée
  const sharedRiverState$ = riverState.pipe(
    observeOn(asyncScheduler),
    debounceTime(100), // Évite les mises à jour trop fréquentes
    distinctUntilKeyChanged('flowRate'), // Optimisation : utilisation de distinctUntilKeyChanged
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('River state stream finalized', 'RiverSimulation');
    }),
    catchError(error => {
      loggingService.error('Error in river state stream', 'RiverSimulation', { error });
      return EMPTY;
    }),
    share()
  );

  // Optimisation : Flux de débit avec gestion améliorée
  const sharedOutflowRate$ = outflowRate.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Outflow rate stream finalized', 'RiverSimulation');
    }),
    share()
  );

  const updateRiverStateInternal = (precipitationMm: number) => {
    // Utilisation de queueScheduler pour les calculs intensifs
    queueScheduler.schedule(() => {
      const currentState = riverState.getValue();
      
      // Validation existante
      if (typeof currentState.flowRate !== 'number' || isNaN(currentState.flowRate)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid flowRate:', "RiverSimulation", { error: 'Invalid flowRate' });
        });
        return;
      }

      const newState = updateRiverState(
        currentState,
        precipitationMm,
        SIMULATION_INTERVAL / 1000,
        BASE_FLOW_RATE,
        PRECIPITATION_IMPACT_FACTOR
      );

      if (isNaN(newState.flowRate)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Calculated flow rate is NaN', "RiverSimulation");
        });
        return;
      }

      // Logging asynchrone avec priorité basse
      asyncScheduler.schedule(() => {
        loggingService.info('New river state:', "RiverSimulation", {
          flowRate: newState.flowRate,
          waterVolume: newState.waterVolume
        });
      }, 0, { priority: -1 });

      outflowRate.next(newState.flowRate);
      riverState.next(newState);
    });
  };

  const startSimulation = () => {
    loggingService.info("River simulation started", "RiverSimulation");
    
    // Création du flux de simulation avec gestion d'erreurs avancée
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          loggingService.error('Simulation error, retrying...', 'RiverSimulation', { 
            error, 
            retryCount 
          });
          return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
        }
      }),
      tap(precipitation => {
        asyncScheduler.schedule(() => {
          loggingService.info("Processing precipitation", "RiverSimulation", { precipitation });
        }, 0, { priority: -1 });
      }),
      takeUntil(destroy$),
      finalize(() => {
        loggingService.info('Simulation stream finalized', 'RiverSimulation');
      }),
      share()
    );

    const subscription = simulation$.subscribe(updateRiverStateInternal);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    destroy$.next();
    destroy$.complete();
    riverState.complete();
    outflowRate.complete();
    loggingService.info("Cleaning up river simulation", "RiverSimulation");
  };

  return {
    riverState$: sharedRiverState$,
    outflowRate$: sharedOutflowRate$,
    startSimulation,
    cleanup,
    updateState: updateRiverStateInternal
  };
}
