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

    // Simuler les changements de débits
    const inflowChange = (Math.random() - 0.5) * 2; // Change entre -1 et 1 m³/s
    const outflowChange = (Math.random() - 0.5) * 2; // Change entre -1 et 1 m³/s

    const newInflowRate = Math.max(0, currentState.inflowRate + inflowChange);
    const newOutflowRate = Math.max(0, currentState.outflowRate + outflowChange);

    // Calculer le changement net du niveau d'eau basé sur les débits
    const netChange = (newInflowRate - newOutflowRate) / 100; // Diviser par 100 pour réduire l'impact

    const newWaterLevel = Math.max(
      currentState.minWaterLevel,
      Math.min(currentState.currentWaterLevel + netChange, currentState.maxWaterLevel)
    );

    if (isNaN(newWaterLevel)) {
      loggingService.error('Calculated water level is NaN. Using current level.', "DamSimulation", { error: 'Calculated water level is NaN' });
      return; // Sortie anticipée si le nouveau niveau est NaN
    }

    loggingService.info('New state:', "DamSimulation", {
      waterLevel: newWaterLevel,
      inflowRate: newInflowRate,
      outflowRate: newOutflowRate
    });

    currentWaterLevel.next(newWaterLevel);
    damState.next({
      ...currentState,
      currentWaterLevel: newWaterLevel,
      inflowRate: newInflowRate,
      outflowRate: newOutflowRate,
      lastUpdated: new Date()
    });
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
