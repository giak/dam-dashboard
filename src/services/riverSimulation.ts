import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { loggingService } from './loggingService';

export interface RiverStateInterface {
  id: string;
  name: string;
  flowRate: number;
  waterVolume: number;
  lastUpdated: Date;
}

export interface RiverSimulationInterface {
  riverState$: Observable<RiverStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => void;
  stopSimulation: () => void;
  cleanup: () => void;
}

const UPDATE_INTERVAL = 1000; // Mise à jour toutes les secondes
const FLOW_RATE_VARIATION = 0.1; // Variation maximale du débit à chaque mise à jour

export function createRiverSimulation(initialState: RiverStateInterface): RiverSimulationInterface {
  const riverState$ = new BehaviorSubject<RiverStateInterface>(initialState);
  let simulationInterval: NodeJS.Timeout | null = null;

  function updateRiverState(): void {
    const currentState = riverState$.getValue();
    const flowRateChange = (Math.random() - 0.5) * 2 * FLOW_RATE_VARIATION * currentState.flowRate;
    const newFlowRate = Math.max(0, currentState.flowRate + flowRateChange);
    
    const newState: RiverStateInterface = {
      ...currentState,
      flowRate: newFlowRate,
      waterVolume: currentState.waterVolume + newFlowRate * (UPDATE_INTERVAL / 1000),
      lastUpdated: new Date()
    };

    riverState$.next(newState);
    loggingService.info('River state updated', 'riverSimulation', { riverId: newState.id, newFlowRate });
  }

  function startSimulation(): void {
    if (!simulationInterval) {
      simulationInterval = setInterval(updateRiverState, UPDATE_INTERVAL);
      loggingService.info('River simulation started', 'riverSimulation', { riverId: initialState.id });
    }
  }

  function stopSimulation(): void {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      loggingService.info('River simulation stopped', 'riverSimulation', { riverId: initialState.id });
    }
  }

  function cleanup(): void {
    stopSimulation();
    riverState$.complete();
    loggingService.info('River simulation cleaned up', 'riverSimulation', { riverId: initialState.id });
  }

  const outflowRate$ = riverState$.pipe(
    map(state => state.flowRate)
  );

  return {
    riverState$: riverState$.asObservable(),
    outflowRate$,
    startSimulation,
    stopSimulation,
    cleanup
  };
}
