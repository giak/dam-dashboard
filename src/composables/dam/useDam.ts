import { browserConfig } from '@config/browserEnv';
import { calculateNetFlow, calculateNewWaterLevel, calculateWaterLevelChange, simulateFlowRate } from '@domain/dam';
import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, distinctUntilChanged, interval, map, shareReplay } from 'rxjs';

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
    shareReplay(1)
  );

  /**
   * Observable qui émet le débit sortant du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const outflowRate$: Observable<number> = damState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable qui émet le débit entrant du barrage.
   * Il filtre les valeurs en double et partage la dernière émission avec les nouveaux abonnés.
   */
  const inflowRate$: Observable<number> = damState$.pipe(
    map(state => state.inflowRate),
    distinctUntilChanged(),
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
    // Calcule le débit net (entrée - sortie)
    const netFlow = calculateNetFlow(currentState.inflowRate, currentState.outflowRate);
    
    // Calcule le changement de niveau d'eau basé sur le débit net et l'intervalle de temps
    const waterLevelChange = calculateWaterLevelChange(netFlow, timeInterval, browserConfig.damSurfaceArea);
    
    // Calcule le nouveau niveau d'eau, en s'assurant qu'il reste dans les limites min et max
    const newWaterLevel = calculateNewWaterLevel(
      currentState.currentWaterLevel,
      waterLevelChange,
      currentState.minWaterLevel,
      currentState.maxWaterLevel
    );

    // Retourne l'état mis à jour avec le nouveau niveau d'eau et les débits simulés
    return {
      ...currentState,
      currentWaterLevel: newWaterLevel,
      inflowRate: simulateFlowRate(currentState.inflowRate, browserConfig.maxFlowRateChange),
      outflowRate: simulateFlowRate(currentState.outflowRate, browserConfig.maxFlowRateChange),
      lastUpdated: new Date(),
    };
  };

  /**
   * Démarre la simulation des changements de niveau d'eau du barrage.
   * Cette fonction configure un intervalle pour mettre à jour régulièrement l'état du barrage.
   * 
   * @returns {Function} Une fonction pour arrêter la simulation
   */
  const startSimulation = () => {
    const subscription = interval(browserConfig.updateInterval).subscribe(() => {
      const currentState = damState$.getValue();
      const updatedState = updateDamState(currentState, browserConfig.updateInterval / 1000);
      damState$.next(updatedState);
    });

    // Retourne une fonction pour arrêter la simulation en se désabonnant de l'intervalle
    return () => subscription.unsubscribe();
  };

  /**
   * Met à jour des propriétés spécifiques de l'état du barrage.
   * Cette fonction permet des mises à jour partielles de l'état du barrage.
   * 
   * @param {DamUpdateInterface} update - Mise à jour partielle de l'état du barrage
   */
  const updateDam = (update: DamUpdateInterface) => {
    const currentState = damState$.getValue();
    damState$.next({ ...currentState, ...update });
  };

  /**
   * Nettoie les ressources utilisées par la simulation du barrage.
   * Cette fonction complète l'observable damState$.
   */
  const cleanup = () => {
    damState$.complete();
  };

  // Retourne un objet avec tous les observables et fonctions nécessaires pour gérer le barrage
  return {
    damState$,
    currentWaterLevel$,
    outflowRate$,
    inflowRate$,
    updateDam,
    startSimulation,
    cleanup,
  };
}
