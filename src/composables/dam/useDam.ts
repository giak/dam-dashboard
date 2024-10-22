import { errorHandlingService } from '@services/errorHandlingService';
import type { AggregatedInflowInterface } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { DamActionsInterface, DamInterface, DamObservablesInterface, DamUpdateInterface, UseDamReturnInterface } from '@type/dam/DamInterface';
import { DamValidationError, updateDamState, validateDamUpdate } from '@utils/dam/damUtils';
import { handleObservableError } from '@utils/errorHandlerUtil';
import { memoize } from '@utils/memoize';
import { BehaviorSubject, Observable, Subject, catchError, distinctUntilChanged, map, shareReplay, takeUntil } from 'rxjs';

/**
 * Interface définissant les dépendances injectables pour la simulation du barrage.
 */
interface DamDependenciesInterface {
  updateDamState: typeof updateDamState;
  validateDamUpdate: typeof validateDamUpdate;
  handleObservableError: typeof handleObservableError;
  loggingService: typeof loggingService;
}

/**
 * Crée les observables nécessaires pour la gestion de l'état du barrage.
 * 
 * @param initialState - L'état initial du barrage
 * @param deps - Les dépendances injectées
 * @param destroy$ - L'observable de destruction
 * @returns Un objet contenant les observables du barrage
 */
function createDamObservables(initialState: DamInterface, deps: DamDependenciesInterface, destroy$: Subject<void>): DamObservablesInterface {
  const damState$ = new BehaviorSubject<DamInterface>(initialState);

  const sharedDamState$ = damState$.pipe(
    takeUntil(destroy$),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  const currentWaterLevel$: Observable<number> = sharedDamState$.pipe(
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    catchError(err => deps.handleObservableError(err, 'WATER_LEVEL_ERROR', 'useDam.currentWaterLevel$'))
  );

  const outflowRate$: Observable<number> = sharedDamState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    catchError(err => deps.handleObservableError(err, 'OUTFLOW_RATE_ERROR', 'useDam.outflowRate$'))
  );

  return { damState$: sharedDamState$, currentWaterLevel$, outflowRate$ };
}

/**
 * Crée la logique de simulation pour le barrage.
 * 
 * @param damState$ - L'observable de l'état du barrage
 * @param aggregatedInflow$ - L'observable du débit d'entrée agrégé
 * @param deps - Les dépendances injectées
 * @param destroy$ - L'observable de destruction
 * @returns Un objet contenant les fonctions de simulation du barrage
 */
function createDamSimulation(damState$: BehaviorSubject<DamInterface>, aggregatedInflow$: Observable<AggregatedInflowInterface>, deps: DamDependenciesInterface, destroy$: Subject<void>) {
  let lastUpdateTime = Date.now();

  const simulateStep = (inflow: AggregatedInflowInterface) => {
    const currentTime = Date.now();
    const timeInterval = (currentTime - lastUpdateTime) / 1000;
    lastUpdateTime = currentTime;

    const currentState = damState$.getValue();
    const updatedState = deps.updateDamState(currentState, timeInterval, inflow.totalInflow);
    damState$.next(updatedState);
  };

  const startSimulation = () => {
    const subscription = aggregatedInflow$.pipe(
      takeUntil(destroy$)
    ).subscribe({
      next: simulateStep,
      error: (err) => {
        errorHandlingService.emitError({
          message: 'Erreur dans la simulation du barrage',
          code: 'DAM_SIMULATION_ERROR',
          timestamp: Date.now(),
          context: 'useDam.startSimulation'
        });
        throw err;
      }
    });
    return () => subscription.unsubscribe();
  };

  return { startSimulation, simulateStep };
}

/**
 * Hook composable pour gérer l'état et les opérations d'un barrage.
 * 
 * @param initialData - L'état initial du barrage
 * @param aggregatedInflow$ - L'observable du débit d'entrée agrégé
 * @param injectedDependencies - Les dépendances optionnelles à injecter (utile pour les tests)
 * @returns Un objet contenant les observables et les actions pour gérer le barrage
 */
export function useDam(
  initialData: DamInterface, 
  aggregatedInflow$: Observable<AggregatedInflowInterface>,
  injectedDependencies?: Partial<DamDependenciesInterface>
): UseDamReturnInterface {
  const deps: DamDependenciesInterface = {
    updateDamState: memoize(updateDamState),
    validateDamUpdate,
    handleObservableError,
    loggingService,
    ...injectedDependencies
  };

  const destroy$ = new Subject<void>();
  const damState$ = new BehaviorSubject<DamInterface>(initialData);
  const { currentWaterLevel$, outflowRate$ } = createDamObservables(initialData, deps, destroy$);
  const { startSimulation, simulateStep } = createDamSimulation(damState$, aggregatedInflow$, deps, destroy$);

  /**
   * Met à jour l'état du barrage avec les nouvelles valeurs fournies.
   * 
   * @param update - Les nouvelles valeurs à appliquer à l'état du barrage
   * @throws {DamValidationError} Si la mise à jour est invalide
   */
  const updateDam: DamActionsInterface['updateDam'] = (update: DamUpdateInterface): void => {
    try {
      deps.validateDamUpdate(update);
      const currentState = damState$.getValue();
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      damState$.next(newState);
    } catch (error) {
      if (error instanceof DamValidationError) {
        errorHandlingService.emitError({
          message: 'Erreur de mise à jour du barrage',
          code: 'DAM_UPDATE_ERROR',
          timestamp: Date.now(),
          context: 'useDam.updateDam'
        });
      }
      throw error;
    }
  };

  /**
   * Nettoie les ressources utilisées par la simulation du barrage.
   */
  const cleanup: DamActionsInterface['cleanup'] = () => {
    destroy$.next();
    destroy$.complete();
    damState$.complete();
    deps.loggingService.info('Dam simulation cleaned up', 'useDam.cleanup');
  };

  return {
    damState$: damState$.asObservable(),
    currentWaterLevel$,
    outflowRate$,
    updateDam,
    startSimulation,
    cleanup,
    _simulateStep: simulateStep
  };
}
