import { createDamSimulation, type DamSimulationInterface } from '@services/damSimulation';
import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, catchError, distinctUntilChanged, of, shareReplay, switchMap, tap } from 'rxjs';

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
  const error$ = new BehaviorSubject<string | null>(null);

  /**
   * initializeDam est une fonction qui initialise l'instance du barrage.
   * Elle crée une nouvelle instance de barrage et démarre la simulation.
   * 
   * @param {DamInterface} damData - L'état initial du barrage.
   */
  const initializeDam = (damData: DamInterface): void => {
    try {
      console.log('useWaterSystem: Initialisation du barrage avec', damData);
      const simulation = createDamSimulation(damData);
      damSimulation$.next(simulation);
      simulation.startSimulation();
      error$.next(null); // Réinitialiser l'erreur si l'initialisation réussit
    } catch (e) {
      console.error('useWaterSystem: Erreur lors de l\'initialisation du barrage', e);
      error$.next(`Erreur d'initialisation: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /**
   * systemState$ est un observable qui émet l'état du barrage.
   * Il réagit aux changements de l'instance du barrage et émet le nouvel état.
   */
  const systemState$: Observable<DamInterface | null> = damSimulation$.pipe(
    switchMap(simulation => simulation ? simulation.damState$ : of(null)),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    tap(state => console.log('useWaterSystem: Nouvel état du système', state)),
    catchError(err => {
      console.error('useWaterSystem: Erreur dans systemState$', err);
      error$.next(`Erreur de l'état du système: ${err instanceof Error ? err.message : String(err)}`);
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
    tap(level => console.log('useWaterSystem: Nouveau niveau d\'eau total', level)),
    catchError(err => {
      console.error('useWaterSystem: Erreur dans totalWaterLevel$', err);
      error$.next(`Erreur du niveau d'eau: ${err instanceof Error ? err.message : String(err)}`);
      return of(0);
    }),
    shareReplay(1)
  );

  /**
   * cleanup est une fonction qui nettoie les ressources utilisées par le système.
   * Elle arrête la simulation, nettoie l'instance du barrage et complète l'observable damSimulation$.
   */
  const cleanup = (): void => {
    console.log('useWaterSystem: Nettoyage');
    try {
      const simulation = damSimulation$.getValue();
      if (simulation) {
        simulation.cleanup();
      }
    } catch (e) {
      console.error('useWaterSystem: Erreur lors du nettoyage', e);
      error$.next(`Erreur de nettoyage: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      damSimulation$.complete();
      error$.complete();
    }
  };

  // Retourne un objet avec toutes les fonctions et observables nécessaires pour gérer le système d'eau
  return {
    initializeDam,
    systemState$,
    totalWaterLevel$,
    cleanup,
    error$
  };
}
