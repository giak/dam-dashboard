import { errorHandlingService } from '@services/errorHandlingService';
import { createGlacierSimulation } from '@services/glacierSimulation';
import { loggingService } from '@services/loggingService';
import type { GlacierStateInterface, GlacierUpdateInterface, UseGlacierReturnInterface } from '@type/glacier/GlacierInterface';
import { GlacierValidationError, validateGlacierUpdate } from '@utils/glacier/glacierUtils';
import { computed, onUnmounted, ref } from 'vue';
import { Observable, Subject, takeUntil, map, shareReplay } from 'rxjs';

interface GlacierDependenciesInterface {
  loggingService: typeof loggingService;
  errorHandlingService: typeof errorHandlingService;
}

// Fonction de mémoïsation
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

export function useGlacier(
  initialData: GlacierStateInterface,
  temperature$: Observable<number>,
  injectedDependencies?: Partial<GlacierDependenciesInterface>
): UseGlacierReturnInterface {
  const deps: GlacierDependenciesInterface = {
    loggingService,
    errorHandlingService,
    ...injectedDependencies
  };

  const destroy$ = new Subject<void>();
  const { glacierState$, simulation$, updateState } = createGlacierSimulation(initialData, temperature$);
  const glacierState = ref<GlacierStateInterface>(initialData);

  // Utilisation de shareReplay pour partager l'état du glacier entre plusieurs abonnés
  const sharedGlacierState$ = glacierState$.pipe(
    takeUntil(destroy$),
    shareReplay(1)
  );

  sharedGlacierState$.subscribe(state => {
    glacierState.value = state;
  });

  const memoizedUpdateState = memoize(updateState);

  const startSimulation = () => {
    const subscription = simulation$.pipe(takeUntil(destroy$)).subscribe(memoizedUpdateState);
    deps.loggingService.info('Glacier simulation started', 'useGlacier', { id: glacierState.value.id });
    return () => {
      subscription.unsubscribe();
      deps.loggingService.info('Glacier simulation stopped', 'useGlacier', { id: glacierState.value.id });
    };
  };

  const updateGlacier = (update: GlacierUpdateInterface): void => {
    try {
      validateGlacierUpdate(update);
      const currentState = glacierState.value;
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      glacierState$.next(newState);
    } catch (error) {
      if (error instanceof GlacierValidationError) {
        deps.errorHandlingService.emitError({
          message: 'Erreur de mise à jour du glacier',
          code: 'GLACIER_UPDATE_ERROR',
          timestamp: Date.now(),
          context: 'useGlacier.updateGlacier'
        });
      }
      throw error;
    }
  };

  const cleanup = (): void => {
    destroy$.next();
    destroy$.complete();
    deps.loggingService.info('Glacier resources cleaned up', 'useGlacier', { id: glacierState.value.id });
  };

  onUnmounted(cleanup);

  // Utilisation de computed pour les valeurs dérivées
  const volume = computed(() => glacierState.value.volume);
  const outflowRate = computed(() => glacierState.value.outflowRate);

  return {
    glacierState: computed(() => glacierState.value),
    glacierState$: sharedGlacierState$,
    outflowRate$: sharedGlacierState$.pipe(map(state => state.outflowRate)),
    volume,
    outflowRate,
    startSimulation,
    updateGlacier,
    cleanup,
    _updateGlacierState: memoizedUpdateState
  };
}
