import type { GlacierStateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import { BehaviorSubject, Observable, asyncScheduler, interval } from 'rxjs';
import { distinctUntilChanged, map, observeOn, share, tap, withLatestFrom } from 'rxjs/operators';
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
  // État principal avec optimisation des émissions et scheduler
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialState);

  // Flux d'état partagé avec optimisation et scheduler
  const sharedGlacierState$ = glacierState$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.volume === curr.volume && 
      prev.meltRate === curr.meltRate &&
      prev.outflowRate === curr.outflowRate
    ),
    share()
  );

  // Optimisation du flux de simulation avec scheduler
  const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
    observeOn(asyncScheduler),
    withLatestFrom(temperature$),
    map(([, temperature]) => temperature),
    distinctUntilChanged(),
    tap(temperature => {
      asyncScheduler.schedule(() => {
        loggingService.info('Processing temperature update', 'GlacierSimulation', { temperature });
      });
    }),
    share()
  );

  const updateState = (temperatureCelsius: number) => {
    // Déplacer les calculs et validations vers asyncScheduler
    asyncScheduler.schedule(() => {
      const currentState = glacierState$.getValue();
      
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

      // Mise à jour de l'état
      glacierState$.next(newState);
      
      // Logging asynchrone
      asyncScheduler.schedule(() => {
        loggingService.info('Glacier state updated', 'GlacierSimulation', {
          temperature: temperatureCelsius,
          meltRate: newState.meltRate,
          outflowRate: newState.outflowRate,
          volume: newState.volume
        });
      });
    });
  };

  return {
    glacierState$: sharedGlacierState$,
    simulation$,
    updateState
  };
}
