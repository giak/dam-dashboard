import type { GlacierStateInterface, GlacierUpdateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
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

export function createGlacierService(initialData: GlacierStateInterface, temperature$: Observable<number>): GlacierServiceInterface {
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialData);

  const updateGlacier = (update: GlacierUpdateInterface): void => {
    try {
      const currentState = glacierState$.getValue();
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      glacierState$.next(newState);
      loggingService.info('Glacier state updated', 'GlacierService', { newState });
    } catch (error) {
      errorHandlingService.emitError({
        message: 'Error updating glacier state',
        timestamp: Date.now(),
        context: 'GlacierService.updateGlacier',
        data: { error, update }
      });
    }
  };

  const startSimulation = (): (() => void) => {
    const subscription = interval(SIMULATION_INTERVAL).pipe(
      withLatestFrom(temperature$),
      map(([, temperature]) => temperature)
    ).subscribe(temperature => {
      const currentState = glacierState$.getValue();
      const newState = updateGlacierState(
        currentState,
        temperature,
        SIMULATION_INTERVAL / 1000, // Convertir en secondes
        BASE_MELT_RATE,
        TEMPERATURE_IMPACT_FACTOR
      );
      glacierState$.next(newState);
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    glacierState$.complete();
  };

  return {
    getGlacierState$: () => glacierState$.asObservable(),
    getOutflowRate$: () => glacierState$.pipe(map(state => state.outflowRate)),
    updateGlacier,
    startSimulation,
    cleanup
  };
}
