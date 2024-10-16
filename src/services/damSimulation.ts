import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, interval } from 'rxjs';

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
    console.log('Current state:', currentState); // Log pour le débogage

    // Vérification des valeurs
    if (typeof currentState.currentWaterLevel !== 'number' || isNaN(currentState.currentWaterLevel)) {
      console.error('Invalid currentWaterLevel:', currentState.currentWaterLevel);
      return; // Sortie anticipée si la valeur n'est pas valide
    }

    if (typeof currentState.maxWaterLevel !== 'number' || isNaN(currentState.maxWaterLevel)) {
      console.error('Invalid maxWaterLevel:', currentState.maxWaterLevel);
      return; // Sortie anticipée si la valeur n'est pas valide
    }

    const change = (Math.random() - 0.5) * 10;
    console.log('Water level change:', change); // Log pour le débogage

    const newWaterLevel = Math.max(
      currentState.minWaterLevel,
      Math.min(currentState.currentWaterLevel + change, currentState.maxWaterLevel)
    );
    console.log('New water level:', newWaterLevel); // Log pour le débogage

    if (isNaN(newWaterLevel)) {
      console.error('Calculated water level is NaN. Using current level.');
      return; // Sortie anticipée si le nouveau niveau est NaN
    }

    currentWaterLevel.next(newWaterLevel);
    damState.next({ ...currentState, currentWaterLevel: newWaterLevel, lastUpdated: new Date() });
  };

  const startSimulation = () => {
    console.log('Starting simulation with initial state:', initialState); // Log pour le débogage
    const subscription = interval(1000).subscribe(updateWaterLevel);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    console.log('Cleaning up simulation'); // Log pour le débogage
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
