import { loggingService } from '@services/loggingService';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface GlacierStateInterface {
  id: string;
  name: string;
  meltRate: number; // Taux de fonte en m³/s
  volume: number; // Volume du glacier en m³
  outflowRate: number; // Débit d'eau sortant en m³/s
  lastUpdated: Date;
}

export interface GlacierSimulationInterface {
  glacierState$: Observable<GlacierStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => void;
  stopSimulation: () => void;
  cleanup: () => void;
}

const UPDATE_INTERVAL = 2000; // Intervalle de mise à jour en millisecondes
const TEMPERATURE_VARIATION = 5; // Variation de température en °C
const BASE_TEMPERATURE = 0; // Température de base en °C
const MELT_RATE_FACTOR = 2; // Facteur de fonte en m³/s/°C

export function createGlacierSimulation(initialState: GlacierStateInterface): GlacierSimulationInterface {
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialState);

  const updateGlacierState = withErrorHandling(() => {
    const currentState = glacierState$.getValue();
    const temperature = BASE_TEMPERATURE + (Math.random() * TEMPERATURE_VARIATION);
    const meltRate = Math.max(0, temperature * MELT_RATE_FACTOR);
    const volumeLoss = meltRate * (UPDATE_INTERVAL / 1000);
    const newVolume = Math.max(0, currentState.volume - volumeLoss);
    const outflowRate = meltRate;

    const newState: GlacierStateInterface = {
      ...currentState,
      meltRate,
      volume: newVolume,
      outflowRate,
      lastUpdated: new Date(),
    };

    glacierState$.next(newState);
    loggingService.info('Glacier state updated', 'glacierSimulation.updateGlacierState', { glacierId: newState.id });
  }, 'glacierSimulation.updateGlacierState');

  let updateInterval: NodeJS.Timeout | null = null;

  const startSimulation = withErrorHandling(() => {
    if (!updateInterval) {
      updateInterval = setInterval(updateGlacierState, UPDATE_INTERVAL);
      loggingService.info('Glacier simulation started', 'glacierSimulation.startSimulation', { glacierId: initialState.id });
    }
  }, 'glacierSimulation.startSimulation');

  const stopSimulation = withErrorHandling(() => {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
      loggingService.info('Glacier simulation stopped', 'glacierSimulation.stopSimulation', { glacierId: initialState.id });
    }
  }, 'glacierSimulation.stopSimulation');

  const cleanup = withErrorHandling(() => {
    stopSimulation();
    glacierState$.complete();
    loggingService.info('Glacier simulation cleaned up', 'glacierSimulation.cleanup', { glacierId: initialState.id });
  }, 'glacierSimulation.cleanup');

  const outflowRate$ = glacierState$.pipe(
    map(state => state.outflowRate),
    shareReplay(1)
  );

  return {
    glacierState$: glacierState$.asObservable(),
    outflowRate$,
    startSimulation,
    stopSimulation,
    cleanup,
  };
}
