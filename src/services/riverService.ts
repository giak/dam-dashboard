import type { RiverStateInterface, RiverUpdateInterface } from '@type/river/RiverInterface';
import { updateRiverState } from '@utils/river/riverUtils';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
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

export function createRiverService(initialData: RiverStateInterface, precipitation$: Observable<number>): RiverServiceInterface {
  const riverState$ = new BehaviorSubject<RiverStateInterface>(initialData);

  const updateRiver = (update: RiverUpdateInterface): void => {
    try {
      const currentState = riverState$.getValue();
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      riverState$.next(newState);
      loggingService.info('River state updated', 'RiverService', { newState });
    } catch (error) {
      errorHandlingService.emitError({
        message: 'Error updating river state',
        timestamp: Date.now(),
        context: 'RiverService.updateRiver',
        data: { error, update }
      });
    }
  };

  const startSimulation = (): (() => void) => {
    const subscription = interval(SIMULATION_INTERVAL).pipe(
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation)
    ).subscribe(precipitation => {
      const currentState = riverState$.getValue();
      const newState = updateRiverState(
        currentState,
        precipitation,
        SIMULATION_INTERVAL / 1000, // Convertir en secondes
        BASE_FLOW_RATE,
        PRECIPITATION_IMPACT_FACTOR
      );
      riverState$.next(newState);
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    riverState$.complete();
  };

  return {
    getRiverState$: () => riverState$.asObservable(),
    getOutflowRate$: () => riverState$.pipe(map(state => state.flowRate)),
    updateRiver,
    startSimulation,
    cleanup
  };
}
