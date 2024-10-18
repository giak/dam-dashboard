import { createDamSimulation, type DamSimulationInterface } from '@services/damSimulation';
import { errorHandlingService } from '@services/errorHandlingService';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import { createInflowAggregator, type InflowSourceInterface } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import { withErrorHandling } from '@utils/errorHandlerUtil';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { useGlacier, type UseGlacierReturnInterface } from './glacier/useGlacier';

// Interfaces
interface WaterSystemState {
  dam: DamInterface | null;
  glacier: GlacierStateInterface | null;
}

interface WaterSystemReturnInterface {
  initializeDam: (damData: DamInterface) => void;
  initializeGlacier: (glacierData: GlacierStateInterface) => void;
  systemState$: Observable<WaterSystemState>;
  totalWaterLevel$: Observable<number>;
  cleanup: () => void;
  error$: Observable<string | null>;
}

/**
 * Crée un observable d'erreur à partir du service de gestion des erreurs.
 * @returns Observable<string | null>
 */
const createErrorObservable = () => 
  errorHandlingService.getErrorObservable().pipe(
    map(errorData => errorData ? `${errorData.context}: ${errorData.message}` : null),
    shareReplay(1)
  );

/**
 * Crée un observable de l'état du système d'eau.
 * @param damSimulation$ Observable de la simulation du barrage
 * @param glacier$ Observable de la simulation du glacier
 * @returns Observable<WaterSystemState>
 */
const createSystemStateObservable = (
  damSimulation$: BehaviorSubject<DamSimulationInterface | null>,
  glacier$: BehaviorSubject<UseGlacierReturnInterface | null>
): Observable<WaterSystemState> => 
  combineLatest([
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
 * Hook personnalisé pour gérer le système d'eau.
 * @returns WaterSystemReturnInterface
 */
export function useWaterSystem(): WaterSystemReturnInterface {
  const damSimulation$ = new BehaviorSubject<DamSimulationInterface | null>(null);
  const glacier$ = new BehaviorSubject<UseGlacierReturnInterface | null>(null);
  const error$ = createErrorObservable();

  const initializeDam = withErrorHandling((damData: DamInterface): void => {
    const glacierInstance = glacier$.getValue();
    const inflowSources: InflowSourceInterface[] = glacierInstance 
      ? [{ name: 'Glacier', outflowRate$: glacierInstance.outflowRate$ }]
      : [];
    
    const aggregatedInflow$ = createInflowAggregator(inflowSources);
    const simulation = createDamSimulation(damData);
    damSimulation$.next(simulation);
    simulation.startSimulation();
    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: damData.id });
  }, 'useWaterSystem.initializeDam');

  const initializeGlacier = withErrorHandling((glacierData: GlacierStateInterface): void => {
    const glacierInstance = useGlacier(glacierData);
    glacier$.next(glacierInstance);
    glacierInstance.startSimulation();
    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: glacierData.id });
    
    // Toujours réinitialiser le barrage
    const currentDamSimulation = damSimulation$.getValue();
    if (currentDamSimulation) {
      currentDamSimulation.damState$.pipe(take(1)).subscribe(damState => {
        if (damState) {
          // Forcer la réinitialisation du barrage
          damSimulation$.next(null);
          initializeDam(damState);
        }
      });
    }
  }, 'useWaterSystem.initializeGlacier');

  const systemState$ = createSystemStateObservable(damSimulation$, glacier$);

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

  const cleanup = withErrorHandling((): void => {
    [damSimulation$.getValue(), glacier$.getValue()].forEach(instance => instance?.cleanup());
    [damSimulation$, glacier$].forEach(subject => subject.complete());
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  }, 'useWaterSystem.cleanup');

  return { initializeDam, initializeGlacier, systemState$, totalWaterLevel$, cleanup, error$ };
}
