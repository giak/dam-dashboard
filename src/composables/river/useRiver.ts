import { loggingService } from '@services/loggingService';
import { createRiverSimulation, type RiverSimulationInterface, type RiverStateInterface } from '@services/riverSimulation';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

export interface UseRiverReturnInterface {
  riverState$: Observable<RiverStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => void;
  stopSimulation: () => void;
  cleanup: () => void;
}

export function useRiver(initialState: RiverStateInterface): UseRiverReturnInterface {
  const riverSimulation: RiverSimulationInterface = createRiverSimulation(initialState);
  const riverState$ = new BehaviorSubject<RiverStateInterface>(initialState);

  const updateRiverState = withErrorHandling((newState: RiverStateInterface) => {
    riverState$.next(newState);
    loggingService.info('River state updated', 'useRiver.updateRiverState', { riverId: newState.id });
  }, 'useRiver.updateRiverState');

  riverSimulation.riverState$.subscribe(updateRiverState);

  const outflowRate$ = riverState$.pipe(
    map(state => state.flowRate),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const startSimulation = withErrorHandling(() => {
    riverSimulation.startSimulation();
    loggingService.info('River simulation started', 'useRiver.startSimulation', { riverId: initialState.id });
  }, 'useRiver.startSimulation');

  const stopSimulation = withErrorHandling(() => {
    riverSimulation.stopSimulation();
    loggingService.info('River simulation stopped', 'useRiver.stopSimulation', { riverId: initialState.id });
  }, 'useRiver.stopSimulation');

  const cleanup = withErrorHandling(() => {
    riverSimulation.cleanup();
    riverState$.complete();
    loggingService.info('River resources cleaned up', 'useRiver.cleanup', { riverId: initialState.id });
  }, 'useRiver.cleanup');

  return {
    riverState$: riverState$.asObservable(),
    outflowRate$,
    startSimulation,
    stopSimulation,
    cleanup
  };
}
