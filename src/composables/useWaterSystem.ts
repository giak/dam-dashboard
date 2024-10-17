import { createDamSimulation, type DamSimulationInterface } from '@services/damSimulation';
import { errorHandlingService, type ErrorDataInterface } from '@services/errorHandlingService';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, combineLatest, catchError, distinctUntilChanged, map, of, shareReplay, switchMap, take } from 'rxjs';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { useGlacier, type UseGlacierReturnInterface } from './glacier/useGlacier';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import { createInflowAggregator, type InflowSourceInterface } from '@services/inflowAggregator';

// Mise à jour de l'interface pour inclure le glacier
interface WaterSystemReturnInterface {
  initializeDam: (damData: DamInterface) => void;
  initializeGlacier: (glacierData: GlacierStateInterface) => void;
  systemState$: Observable<{ dam: DamInterface | null; glacier: GlacierStateInterface | null }>;
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
  const glacier$ = new BehaviorSubject<UseGlacierReturnInterface | null>(null);
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
    const glacierInstance = glacier$.getValue();
    const inflowSources: InflowSourceInterface[] = [];
    
    if (glacierInstance) {
      inflowSources.push({ name: 'Glacier', outflowRate$: glacierInstance.outflowRate$ });
    }
    
    const aggregatedInflow$ = createInflowAggregator(inflowSources);
    const simulation = createDamSimulation(damData);
    damSimulation$.next(simulation);
    simulation.startSimulation();
    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: damData.id });
  }, 'useWaterSystem.initializeDam');

  /**
   * initializeGlacier est une fonction qui initialise l'instance du glacier.
   * Elle crée une nouvelle instance du glacier et démarre la simulation.
   * 
   * @param {GlacierStateInterface} glacierData - L'état initial du glacier.
   */
  const initializeGlacier = withErrorHandling((glacierData: GlacierStateInterface): void => {
    const glacierInstance = useGlacier(glacierData);
    glacier$.next(glacierInstance);
    glacierInstance.startSimulation();
    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: glacierData.id });
    
    // Réinitialiser le barrage avec la nouvelle source d'eau
    const currentDamSimulation = damSimulation$.getValue();
    if (currentDamSimulation) {
      currentDamSimulation.damState$.pipe(
        take(1)
      ).subscribe(damState => {
        if (damState) {
          initializeDam(damState);
        }
      });
    }
  }, 'useWaterSystem.initializeGlacier');

  /**
   * systemState$ est un observable qui émet l'état du barrage et du glacier.
   * Il réagit aux changements de l'instance du barrage et du glacier et émet le nouvel état.
   */
  const systemState$: Observable<{ dam: DamInterface | null; glacier: GlacierStateInterface | null }> = combineLatest([
    damSimulation$.pipe(switchMap(simulation => simulation ? simulation.damState$ : of(null))),
    glacier$.pipe(switchMap(glacierInstance => glacierInstance ? glacierInstance.glacierState$ : of(null)))
  ]).pipe(
    map(([damState, glacierState]) => ({ dam: damState, glacier: glacierState })),
    catchError(err => {
      errorHandlingService.emitError({
        message: `Erreur de l'état du système: ${err instanceof Error ? err.message : String(err)}`,
        code: 'SYSTEM_STATE_ERROR',
        timestamp: Date.now(),
        context: 'useWaterSystem.systemState$'
      });
      return of({ dam: null, glacier: null });
    }),
    shareReplay(1)
  );

  /**
   * totalWaterLevel$ est un observable qui émet le niveau d'eau total.
   * Il réagit aux changements de l'instance du barrage et émet le nouveau niveau d'eau.
   */
  const totalWaterLevel$: Observable<number> = systemState$.pipe(
    map(({ dam }) => dam ? dam.currentWaterLevel : 0),
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
    const damSimulation = damSimulation$.getValue();
    if (damSimulation) {
      damSimulation.cleanup();
    }
    const glacierInstance = glacier$.getValue();
    if (glacierInstance) {
      glacierInstance.cleanup();
    }
    damSimulation$.complete();
    glacier$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  }, 'useWaterSystem.cleanup');

  // Retourne un objet avec toutes les fonctions et observables nécessaires pour gérer le système d'eau
  return {
    initializeDam,
    initializeGlacier,
    systemState$,
    totalWaterLevel$,
    cleanup,
    error$
  };
}
