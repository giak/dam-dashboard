import { browserConfig } from '@config/browserEnv';
import { calculateNetFlow, calculateNewWaterLevel, calculateWaterLevelChange, simulateFlowRate } from '@domain/dam';
import { errorHandlingService } from '@services/errorHandlingService';
import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, interval, map, shareReplay, throwError } from 'rxjs';

/**
 * Fonction composable pour gérer l'état et les opérations d'un barrage.
 * Cette fonction encapsule la logique de simulation et de mise à jour des niveaux d'eau et des débits d'un barrage.
 * 
 * @param {DamInterface} initialData - État initial du barrage
 * @returns {Object} Un objet contenant des observables et des méthodes pour la gestion du barrage
 */
export function useDam(initialData: DamInterface) {
  // BehaviorSubject pour contenir et émettre l'état actuel du barrage
  const damState$ = new BehaviorSubject<DamInterface>(initialData);

  /**
   * Observable qui émet le niveau d'eau actuel du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const currentWaterLevel$: Observable<number> = damState$.pipe(
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur lors de la récupération du niveau d'eau: ${err instanceof Error ? err.message : String(err)}`,
        code: 'WATER_LEVEL_ERROR',
        timestamp: Date.now(),
        context: 'useDam.currentWaterLevel$'
      });
      return throwError(() => err);
    }),
    shareReplay(1)
  );

  /**
   * Observable qui émet le débit sortant du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const outflowRate$: Observable<number> = damState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur lors de la récupération du débit sortant: ${err instanceof Error ? err.message : String(err)}`,
        code: 'OUTFLOW_RATE_ERROR',
        timestamp: Date.now(),
        context: 'useDam.outflowRate$'
      });
      return throwError(() => err);
    }),
    shareReplay(1)
  );

  /**
   * Observable qui émet le débit entrant du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const inflowRate$: Observable<number> = damState$.pipe(
    map(state => state.inflowRate),
    distinctUntilChanged(),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur lors de la récupération du débit entrant: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INFLOW_RATE_ERROR',
        timestamp: Date.now(),
        context: 'useDam.inflowRate$'
      });
      return throwError(() => err);
    }),
    shareReplay(1)
  );

  /**
   * Met à jour l'état du barrage en fonction des débits actuels et de l'intervalle de temps.
   * Cette fonction calcule le nouveau niveau d'eau et simule les changements de débits.
   * 
   * @param {DamInterface} currentState - État actuel du barrage
   * @param {number} timeInterval - Intervalle de temps pour la mise à jour en secondes
   * @returns {DamInterface} État mis à jour du barrage
   */
  const updateDamState = (currentState: DamInterface, timeInterval: number): DamInterface => {
    const netFlow = calculateNetFlow(currentState.inflowRate, currentState.outflowRate);
    const waterLevelChange = calculateWaterLevelChange(netFlow, timeInterval, browserConfig.damSurfaceArea);
    const newWaterLevel = calculateNewWaterLevel(
      currentState.currentWaterLevel,
      waterLevelChange,
      currentState.minWaterLevel,
      currentState.maxWaterLevel
    );

    return {
      ...currentState,
      currentWaterLevel: newWaterLevel,
      inflowRate: simulateFlowRate(currentState.inflowRate, browserConfig.maxFlowRateChange),
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
  const updateDam = withErrorHandling((update: DamUpdateInterface): void => {
    const currentState = damState$.getValue();
    const newState = { ...currentState, ...update, lastUpdated: new Date() };
    
    // Add explicit error checking
    if (isNaN(newState.currentWaterLevel)) {
      errorHandlingService.emitError({
        message: "Invalid water level update",
        code: "WATER_LEVEL_ERROR",
        timestamp: Date.now(),
        context: "useDam.updateDam"
      });
      return; // Don't update state if there's an error
    }
    
    damState$.next(newState);
  }, 'useDam.updateDam');

  /**
   * Démarre la simulation des changements de niveau d'eau du barrage.
   * Cette fonction configure un intervalle pour mettre à jour régulièrement l'état du barrage.
   * 
   * @returns {Function} Une fonction pour arrêter la simulation
   */
  const startSimulation = withErrorHandling(() => {
    const subscription = interval(browserConfig.updateInterval).subscribe(() => {
      const currentState = damState$.getValue();
      const updatedState = updateDamState(currentState, browserConfig.updateInterval / 1000);
      damState$.next(updatedState);
    });

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
    inflowRate$,
    updateDam,
    startSimulation,
    cleanup,
  };
}
