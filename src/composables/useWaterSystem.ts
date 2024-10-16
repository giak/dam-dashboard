import { useDam } from '@composables/dam/useDam';
import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, distinctUntilChanged, Observable, shareReplay, switchMap, tap } from 'rxjs';

/**
 * useWaterSystem est une fonction composable qui fournit un flux de données sur l'état du barrage.
 * Elle gère l'initialisation, la mise à jour et le nettoyage des ressources liées au système de gestion de l'eau.
 * 
 * @returns {Object} Un objet contenant l'état du barrage, le niveau d'eau actuel, et des fonctions de gestion.
 */
export function useWaterSystem() {
  /**
   * dam$ est un BehaviorSubject qui émet l'instance du barrage.
   * Il permet de gérer dynamiquement l'état du barrage et de réagir aux changements.
   */
  const dam$ = new BehaviorSubject<ReturnType<typeof useDam> | null>(null);

  /**
   * initializeDam est une fonction qui initialise l'instance du barrage.
   * Elle crée une nouvelle instance de barrage et démarre la simulation.
   * 
   * @param {DamInterface} damData - L'état initial du barrage.
   */
  const initializeDam = (damData: DamInterface) => {
    console.log('useWaterSystem: Initialisation du barrage avec', damData);
    const damInstance = useDam(damData);
    dam$.next(damInstance);
    // Démarrer la simulation après l'initialisation
    damInstance.startSimulation();
  };

  /**
   * systemState$ est un observable qui émet l'état du barrage.
   * Il réagit aux changements de l'instance du barrage et émet le nouvel état.
   */
  const systemState$: Observable<DamInterface | null> = dam$.pipe(
    switchMap(dam => dam?.damState$ ?? new BehaviorSubject(null)),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    tap(state => console.log('useWaterSystem: Nouvel état du système', state)),
    shareReplay(1)
  );

  /**
   * totalWaterLevel$ est un observable qui émet le niveau d'eau total.
   * Il réagit aux changements de l'instance du barrage et émet le nouveau niveau d'eau.
   */
  const totalWaterLevel$: Observable<number> = dam$.pipe(
    switchMap(dam => dam?.currentWaterLevel$ ?? new BehaviorSubject(0)),
    distinctUntilChanged(),
    tap(level => console.log('useWaterSystem: Nouveau niveau d\'eau total', level)),
    shareReplay(1)
  );

  /**
   * cleanup est une fonction qui nettoie les ressources utilisées par le système.
   * Elle arrête la simulation, nettoie l'instance du barrage et complète l'observable dam$.
   */
  const cleanup = () => {
    console.log('useWaterSystem: Nettoyage');
    const damInstance = dam$.getValue();
    if (damInstance) {
      // Arrêter la simulation avant le nettoyage
      const stopSimulation = damInstance.startSimulation();
      stopSimulation();
      damInstance.cleanup();
    }
    dam$.complete();
  };

  // Retourne un objet avec toutes les fonctions et observables nécessaires pour gérer le système d'eau
  return {
    initializeDam,
    systemState$,
    totalWaterLevel$,
    cleanup
  };
}
