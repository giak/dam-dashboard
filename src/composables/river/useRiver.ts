import { errorHandlingService } from '@services/errorHandlingService';
import { loggingService } from '@services/loggingService';
import { createRiverSimulation, type RiverSimulationInterface } from '@services/riverSimulation';
import type { RiverStateInterface, RiverUpdateInterface, UseRiverReturnInterface } from '@type/river/RiverInterface';
import { memoize } from '@utils/memoize';
import { RiverValidationError, validateRiverUpdate } from '@utils/river/riverUtils';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';
import { computed, onUnmounted, ref } from 'vue';

interface RiverDependenciesInterface {
  loggingService: typeof loggingService;
  errorHandlingService: typeof errorHandlingService;
  createRiverSimulation: typeof createRiverSimulation;
}

export function useRiver(
  initialData: RiverStateInterface,
  precipitation$: Observable<number>,
  injectedDependencies?: Partial<RiverDependenciesInterface>
): UseRiverReturnInterface {
  const deps: RiverDependenciesInterface = {
    loggingService,
    errorHandlingService,
    createRiverSimulation,
    ...injectedDependencies
  };

  const destroy$ = new Subject<void>();
  const riverSimulation: RiverSimulationInterface = deps.createRiverSimulation(initialData, precipitation$);
  
  const sharedRiverState$ = riverSimulation.riverState$.pipe(
    takeUntil(destroy$),
    shareReplay(1)
  );

  const riverState = ref<RiverStateInterface>(initialData);

  sharedRiverState$.subscribe(state => {
    riverState.value = state;
  });

  const memoizedUpdateState = memoize(riverSimulation.updateState);

  const startSimulation = () => {
    const stopSimulation = riverSimulation.startSimulation();
    deps.loggingService.info('River simulation started', 'useRiver', { id: riverState.value.id });
    return () => {
      stopSimulation();
      deps.loggingService.info('River simulation stopped', 'useRiver', { id: riverState.value.id });
    };
  };

  const updateRiver = (update: RiverUpdateInterface): void => {
    try {
      validateRiverUpdate(update);
      const currentState = riverState.value;
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      (riverSimulation.riverState$ as BehaviorSubject<RiverStateInterface>).next(newState);
    } catch (error) {
      if (error instanceof RiverValidationError) {
        deps.errorHandlingService.emitError({
          message: 'Error updating river state',
          code: 'RIVER_UPDATE_ERROR',
          timestamp: Date.now(),
          context: 'useRiver.updateRiver'
        });
      }
      throw error;
    }
  };

  const cleanup = (): void => {
    destroy$.next();
    destroy$.complete();
    riverSimulation.cleanup();
    deps.loggingService.info('River resources cleaned up', 'useRiver', { id: riverState.value.id });
  };

  onUnmounted(cleanup);

  // Computed properties for derived values
  const flowRate = computed(() => riverState.value.flowRate);
  const waterVolume = computed(() => riverState.value.waterVolume);

  return {
    riverState: computed(() => riverState.value),
    riverState$: sharedRiverState$,
    outflowRate$: sharedRiverState$.pipe(map(state => state.flowRate)),
    flowRate,
    waterVolume,
    startSimulation,
    updateRiver,
    cleanup,
    _updateRiverState: memoizedUpdateState
  };
}
