import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { loggingService } from "./loggingService";

export interface DamSimulationInterface {
  damState$: Observable<DamInterface>;
  currentWaterLevel$: Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamSimulation(initialState: DamInterface): DamSimulationInterface {
  const damState = new BehaviorSubject<DamInterface>(initialState);
  const currentWaterLevel = new BehaviorSubject<number>(initialState.currentWaterLevel);

  const updateWaterLevel = () => {
    const currentState = damState.getValue();
    loggingService.info("Current state:", "DamSimulation", { state: currentState }); // Log pour le débogage

    // Vérification des valeurs
    if (typeof currentState.currentWaterLevel !== 'number' || isNaN(currentState.currentWaterLevel)) {
      loggingService.error('Invalid currentWaterLevel:', "DamSimulation", { error: 'Invalid currentWaterLevel' });
      return; // Sortie anticipée si la valeur n'est pas valide
    }

    if (typeof currentState.maxWaterLevel !== 'number' || isNaN(currentState.maxWaterLevel)) {
      loggingService.error('Invalid maxWaterLevel:', "DamSimulation", { error: 'Invalid maxWaterLevel' });
      return; // Sortie anticipée si la valeur n'est pas valide
    }

    const change = (Math.random() - 0.5) * 10;
    loggingService.info('Water level change:', "DamSimulation", { change: change }); // Log pour le débogage

    const newWaterLevel = Math.max(
      currentState.minWaterLevel,
      Math.min(currentState.currentWaterLevel + change, currentState.maxWaterLevel)
    );
    loggingService.info('New water level:', "DamSimulation", { newWaterLevel: newWaterLevel }); // Log pour le débogage

    if (isNaN(newWaterLevel)) {
      loggingService.error('Calculated water level is NaN. Using current level.', "DamSimulation", { error: 'Calculated water level is NaN' });
      return; // Sortie anticipée si le nouveau niveau est NaN
    }

    currentWaterLevel.next(newWaterLevel);
    damState.next({ ...currentState, currentWaterLevel: newWaterLevel, lastUpdated: new Date() });
  };

  const startSimulation = () => {
    loggingService.info("Simulation started", "DamSimulation");
    const subscription = interval(1000).subscribe(updateWaterLevel);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    loggingService.info("Cleaning up simulation", "DamSimulation"); // Log pour le débogage
    damState.complete();
    currentWaterLevel.complete();
  };

  return {
    damState$: damState.asObservable(),
    currentWaterLevel$: currentWaterLevel.asObservable(),
    startSimulation,
    cleanup
  };
}
