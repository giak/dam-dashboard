import type { RiverStateInterface } from '@type/river/RiverInterface';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { loggingService } from "./loggingService";
import { updateRiverState } from '@utils/river/riverUtils';

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
  const riverState = new BehaviorSubject<RiverStateInterface>(initialState);
  const outflowRate = new BehaviorSubject<number>(initialState.flowRate);

  const updateRiverStateInternal = (precipitationMm: number) => {
    const currentState = riverState.getValue();
    loggingService.info("Current river state:", "RiverSimulation", { state: currentState });

    // Vérification des valeurs
    if (typeof currentState.flowRate !== 'number' || isNaN(currentState.flowRate)) {
      loggingService.error('Invalid flowRate:', "RiverSimulation", { error: 'Invalid flowRate' });
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
      loggingService.error('Calculated flow rate is NaN. Using current rate.', "RiverSimulation", { error: 'Calculated flow rate is NaN' });
      return;
    }

    loggingService.info('New river state:', "RiverSimulation", {
      flowRate: newState.flowRate,
      waterVolume: newState.waterVolume
    });

    outflowRate.next(newState.flowRate);
    riverState.next(newState);
  };

  const startSimulation = () => {
    loggingService.info("River simulation started", "RiverSimulation");
    const subscription = interval(SIMULATION_INTERVAL).pipe(
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation)
    ).subscribe(updateRiverStateInternal);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    loggingService.info("Cleaning up river simulation", "RiverSimulation");
    riverState.complete();
    outflowRate.complete();
  };

  return {
    riverState$: riverState.asObservable(),
    outflowRate$: outflowRate.asObservable(),
    startSimulation,
    cleanup,
    updateState: updateRiverStateInternal
  };
}
