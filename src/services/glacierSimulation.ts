import type { GlacierStateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import {
  asyncScheduler,
  BehaviorSubject,
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
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  finalize,
  map,
  observeOn,
  retry,
  share,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { loggingService } from './loggingService';

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_MELT_RATE = 0.1; // Base melt rate in m³/s
const TEMPERATURE_IMPACT_FACTOR = 0.05; // How much temperature affects melt rate

export interface GlacierSimulationInterface {
  glacierState$: Observable<GlacierStateInterface>;
  simulation$: Observable<number>;
  updateState: (temperatureCelsius: number) => void;
}

export function createGlacierSimulation(
  initialState: GlacierStateInterface,
  temperature$: Observable<number>
): GlacierSimulationInterface {
  const destroy$ = new Subject<void>();
  const glacierState = new BehaviorSubject<GlacierStateInterface>(initialState);

  // Optimisation : Flux d'état partagé avec scheduler et gestion d'erreurs
  const sharedGlacierState$ = glacierState.pipe(
    observeOn(asyncScheduler),
    debounceTime(100), // Évite les mises à jour trop fréquentes
    distinctUntilKeyChanged('volume'),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Glacier state stream finalized', 'GlacierSimulation');
    }),
    catchError(error => {
      loggingService.error('Error in glacier state stream', 'GlacierSimulation', { error });
      return EMPTY;
    }),
    share()
  );

  // Optimisation du flux de simulation avec scheduler et gestion d'erreurs
  const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
    observeOn(asyncScheduler),
    withLatestFrom(temperature$),
    map(([, temperature]) => temperature),
    bufferTime(100, undefined, 5), // Buffer max 5 items sur 100ms
    filter(updates => updates.length > 0),
    map(updates => updates[updates.length - 1]),
    distinctUntilChanged(),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        loggingService.error('Simulation error, retrying...', 'GlacierSimulation', { 
          error, 
          retryCount 
        });
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    tap({
      next: temperature => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing temperature update', 'GlacierSimulation', { temperature });
        }, 0, { priority: -1 });
      },
      error: error => {
        loggingService.error('Simulation error', 'GlacierSimulation', { error });
      },
      finalize: () => {
        loggingService.info('Simulation finalized', 'GlacierSimulation');
      }
    }),
    takeUntil(destroy$),
    share()
  ) as Observable<number>;

  const updateState = (temperatureCelsius: number) => {
    // Utilisation de queueScheduler pour les calculs intensifs
    queueScheduler.schedule(() => {
      const currentState = glacierState.value;
      
      // Validation des données
      if (typeof currentState.volume !== 'number' || isNaN(currentState.volume)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid glacier volume', 'GlacierSimulation', { 
            error: 'Invalid volume',
            state: currentState 
          });
        });
        return;
      }

      const newState = updateGlacierState(
        currentState,
        temperatureCelsius,
        SIMULATION_INTERVAL,
        BASE_MELT_RATE,
        TEMPERATURE_IMPACT_FACTOR
      );

      // Validation du nouvel état
      if (isNaN(newState.meltRate) || isNaN(newState.outflowRate)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid calculated rates', 'GlacierSimulation', {
            error: 'Invalid rates',
            newState
          });
        });
        return;
      }

      glacierState.next(newState);
      
      // Logging asynchrone avec priorité basse
      asyncScheduler.schedule(() => {
        loggingService.info('Glacier state updated', 'GlacierSimulation', {
          temperature: temperatureCelsius,
          meltRate: newState.meltRate,
          outflowRate: newState.outflowRate,
          volume: newState.volume
        });
      }, 0, { priority: -1 });
    });
  };

  return {
    glacierState$: sharedGlacierState$,
    simulation$,
    updateState
  };
}
