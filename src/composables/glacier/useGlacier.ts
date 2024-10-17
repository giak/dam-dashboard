import { createGlacierSimulation, type GlacierSimulationInterface, type GlacierStateInterface } from '@services/glacierSimulation';
import { loggingService } from '@services/loggingService';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

export interface UseGlacierReturnInterface {
  glacierState$: Observable<GlacierStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => void;
  stopSimulation: () => void;
  cleanup: () => void;
}

export function useGlacier(initialState: GlacierStateInterface): UseGlacierReturnInterface {
  const glacierSimulation: GlacierSimulationInterface = createGlacierSimulation(initialState);
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialState);

  const updateGlacierState = withErrorHandling((newState: GlacierStateInterface) => {
    glacierState$.next(newState);
    loggingService.info('Glacier state updated', 'useGlacier.updateGlacierState', { glacierId: newState.id });
  }, 'useGlacier.updateGlacierState');

  glacierSimulation.glacierState$.subscribe(updateGlacierState);

  const outflowRate$ = glacierState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const startSimulation = withErrorHandling(() => {
    glacierSimulation.startSimulation();
    loggingService.info('Glacier simulation started', 'useGlacier.startSimulation', { glacierId: initialState.id });
  }, 'useGlacier.startSimulation');

  const stopSimulation = withErrorHandling(() => {
    glacierSimulation.stopSimulation();
    loggingService.info('Glacier simulation stopped', 'useGlacier.stopSimulation', { glacierId: initialState.id });
  }, 'useGlacier.stopSimulation');

  const cleanup = withErrorHandling(() => {
    glacierSimulation.cleanup();
    glacierState$.complete();
    loggingService.info('Glacier resources cleaned up', 'useGlacier.cleanup', { glacierId: initialState.id });
  }, 'useGlacier.cleanup');

  return {
    glacierState$: glacierState$.asObservable(),
    outflowRate$,
    startSimulation,
    stopSimulation,
    cleanup
  };
}
