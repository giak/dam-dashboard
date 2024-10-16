import { createDamSimulation, type DamSimulationInterface } from '@services/damSimulation';
import { errorHandlingService, type ErrorDataInterface } from '@services/errorHandlingService';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, map, of, shareReplay, switchMap } from 'rxjs';
import { withErrorHandling } from '@utils/errorHandlerUtil';

// Nouvelle interface pour le retour de useWaterSystem
interface WaterSystemReturnInterface {
  initializeDam: (damData: DamInterface) => void;
  systemState$: Observable<DamInterface | null>;
  totalWaterLevel$: Observable<number>;
  cleanup: () => void;
  error$: Observable<string | null>;
}

/**
 * useWaterSystem est une fonction composable qui fournit un flux de données sur l'état du barrage.
 * Elle gère l'initialisation, la mise à jour et le nettoyage des ressources liées au système de gestion de l'eau.
 * 
 * @returns {WaterSystemReturnInterface} Un objet contenant l'état du barrage, le niveau d'eau actuel, et des fonctions de gestion.
 */
export function useWaterSystem(): WaterSystemReturnInterface {
  /**
   * damSimulation$ est un BehaviorSubject qui émet l'instance de simulation du barrage.
   * Il permet de gérer dynamiquement l'état du barrage et de réagir aux changements.
   */
  const damSimulation$ = new BehaviorSubject<DamSimulationInterface | null>(null);
  const error$ = errorHandlingService.getErrorObservable().pipe(
    map((errorData: ErrorDataInterface | null) => errorData ? `${errorData.context}: ${errorData.message}` : null)
  );

  /**
   * initializeDam est une fonction qui initialise l'instance du barrage.
   * Elle crée une nouvelle instance de barrage et démarre la simulation.
   * 
   * @param {DamInterface} damData - L'état initial du barrage.
   */
  const initializeDam = withErrorHandling((damData: DamInterface): void => {
    const simulation = createDamSimulation(damData);
    damSimulation$.next(simulation);
    simulation.startSimulation();
    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: damData.id });
  }, 'useWaterSystem.initializeDam');

  /**
   * systemState$ est un observable qui émet l'état du barrage.
   * Il réagit aux changements de l'instance du barrage et émet le nouvel état.
   */
  const systemState$: Observable<DamInterface | null> = damSimulation$.pipe(
    switchMap(simulation => simulation ? simulation.damState$ : of(null)),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur de l'état du système: ${err instanceof Error ? err.message : String(err)}`,
        code: 'SYSTEM_STATE_ERROR',
        timestamp: Date.now(),
        context: 'useWaterSystem.systemState$'
      });
      return of(null);
    }),
    shareReplay(1)
  );

  /**
   * totalWaterLevel$ est un observable qui émet le niveau d'eau total.
   * Il réagit aux changements de l'instance du barrage et émet le nouveau niveau d'eau.
   */
  const totalWaterLevel$: Observable<number> = damSimulation$.pipe(
    switchMap(simulation => simulation ? simulation.currentWaterLevel$ : of(0)),
    distinctUntilChanged(),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur du niveau d'eau: ${err instanceof Error ? err.message : String(err)}`,
        code: 'WATER_LEVEL_ERROR',
        timestamp: Date.now(),
        context: 'useWaterSystem.totalWaterLevel$'
      });
      return of(0);
    }),
    shareReplay(1)
  );

  /**
   * cleanup est une fonction qui nettoie les ressources utilisées par le système.
   * Elle arrête la simulation, nettoie l'instance du barrage et complète l'observable damSimulation$.
   */
  const cleanup = withErrorHandling((): void => {
    const simulation = damSimulation$.getValue();
    if (simulation) {
      simulation.cleanup();
    }
    damSimulation$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  }, 'useWaterSystem.cleanup');

  // Retourne un objet avec toutes les fonctions et observables nécessaires pour gérer le système d'eau
  return {
    initializeDam,
    systemState$,
    totalWaterLevel$,
    cleanup,
    error$
  };
}
