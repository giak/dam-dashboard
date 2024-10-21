import { browserConfig } from '@config/browserEnv';
import { calculateNetFlow, calculateNewWaterLevel, calculateWaterLevelChange, simulateFlowRate } from '@domain/dam';
import { type AggregatedInflowInterface } from '@services/inflowAggregator';
import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { handleObservableError, withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, map, shareReplay } from 'rxjs';

/**
 * Fonction composable pour gérer l'état et les opérations d'un barrage.
 * Cette fonction encapsule la logique de simulation et de mise à jour des niveaux d'eau et des débits d'un barrage.
 * 
 * @param {DamInterface} initialData - État initial du barrage
 * @param {Observable<AggregatedInflowInterface>} aggregatedInflow$ - Flux d'eau entrante agrégé
 * @returns {Object} Un objet contenant des observables et des méthodes pour la gestion du barrage
 */
export function useDam(initialData: DamInterface, aggregatedInflow$: Observable<AggregatedInflowInterface>) {
  // BehaviorSubject pour contenir et émettre l'état actuel du barrage
  const damState$ = new BehaviorSubject<DamInterface>(initialData);
  let lastUpdateTime = Date.now();

  /**
   * Observable qui émet le niveau d'eau actuel du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const currentWaterLevel$: Observable<number> = damState$.pipe(
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    catchError(err => handleObservableError(err, 'WATER_LEVEL_ERROR', 'useDam.currentWaterLevel$')),
    shareReplay(1)
  );

  /**
   * Observable qui émet le débit sortant du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const outflowRate$: Observable<number> = damState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    catchError(err => handleObservableError(err, 'OUTFLOW_RATE_ERROR', 'useDam.outflowRate$')),
    shareReplay(1)
  );

  /**
   * Met à jour l'état du barrage en fonction des débits actuels et de l'intervalle de temps.
   * Cette fonction calcule le nouveau niveau d'eau et simule les changements de débits.
   * 
   * @param {DamInterface} currentState - État actuel du barrage
   * @param {number} timeInterval - Intervalle de temps pour la mise à jour en secondes
   * @param {number} totalInflow - Débit d'eau entrant total
   * @returns {DamInterface} État mis à jour du barrage
   */
  const updateDamState = (currentState: DamInterface, timeInterval: number, totalInflow: number): DamInterface => {
    const netFlow = calculateNetFlow(totalInflow, currentState.outflowRate);
    const waterLevelChange = calculateWaterLevelChange(netFlow, timeInterval, browserConfig.damSurfaceArea);
    const newWaterLevel = calculateNewWaterLevel(
      currentState.currentWaterLevel,
      waterLevelChange,
      currentState.minWaterLevel,
      currentState.maxWaterLevel
    );

    // Assurez-vous que le nouveau niveau d'eau est différent de l'ancien
    const adjustedWaterLevel = newWaterLevel === currentState.currentWaterLevel 
      ? newWaterLevel + 0.001 
      : newWaterLevel;

    return {
      ...currentState,
      currentWaterLevel: adjustedWaterLevel,
      inflowRate: totalInflow,
      outflowRate: simulateFlowRate(currentState.outflowRate, browserConfig.maxFlowRateChange),
      lastUpdated: new Date(),
    };
  };

  /**
   * Met à jour des propriétés spécifiques de l'état du barrage.
   * Cette fonction permet des mises à jour partielles de l'état du barrage.
   * 
   * @param {DamUpdateInterface} update - Mise à jour partielle de l'état du barrage
   */
  const updateDam = (update: DamUpdateInterface): void => {
    const currentState = damState$.getValue();
    const newState = { ...currentState, ...update, lastUpdated: new Date() };
    
    if (isNaN(newState.currentWaterLevel)) {
      throw new Error("Invalid water level update");
    }
    
    damState$.next(newState);
  };

  const simulateStep = (inflow: AggregatedInflowInterface) => {
    const currentTime = Date.now();
    const timeInterval = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
    lastUpdateTime = currentTime;

    const currentState = damState$.getValue();
    const updatedState = updateDamState(currentState, timeInterval, inflow.totalInflow);
    damState$.next(updatedState);
  };

  /**
   * Démarre la simulation des changements de niveau d'eau du barrage.
   * Cette fonction configure un intervalle pour mettre à jour régulièrement l'état du barrage.
   * 
   * @returns {Function} Une fonction pour arrêter la simulation
   */
  const startSimulation = withErrorHandling(() => {
    const subscription = aggregatedInflow$.subscribe(simulateStep);
    return () => subscription.unsubscribe();
  }, 'useDam.startSimulation');

  /**
   * Nettoie les ressources utilisées par la simulation du barrage.
   * Cette fonction complète l'observable damState$.
   */
  const cleanup = withErrorHandling(() => {
    damState$.complete();
  }, 'useDam.cleanup');

  // Retourne un objet avec tous les observables et fonctions nécessaires pour gérer le barrage
  return {
    damState$: damState$.asObservable(),
    currentWaterLevel$,
    outflowRate$,
    updateDam,
    startSimulation,
    cleanup,
    // Exposer simulateStep pour les tests
    _simulateStep: simulateStep
  };
}
