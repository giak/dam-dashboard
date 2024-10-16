import { useDam } from '@composables/dam/useDam';
import { useGlacier } from '@composables/glacier/useGlacier';
import { useRiver } from '@composables/river/useRiver';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { RiverStateInterface } from '@services/riverSimulation';
import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

export function useWaterSystem() {
  let damSimulation: ReturnType<typeof useDam> | null = null;
  let glacierSimulation: ReturnType<typeof useGlacier> | null = null;
  let riverSimulation: ReturnType<typeof useRiver> | null = null;

  const damState$ = new BehaviorSubject<DamInterface | null>(null);
  const glacierState$ = new BehaviorSubject<GlacierStateInterface | null>(null);
  const riverState$ = new BehaviorSubject<RiverStateInterface | null>(null);
  const error$ = new Subject<string | null>();

  const { addSource, removeSource, aggregatedInflow$ } = createInflowAggregator([]);

  function initializeDam(initialData: DamInterface) {
    damSimulation = useDam(initialData, aggregatedInflow$);
    damSimulation.damState$.subscribe(damState$);
    damSimulation.startSimulation();

    loggingService.info('Dam simulation initialized', 'useWaterSystem.initializeDam', { damId: initialData.id });
  }

  function initializeGlacier(initialData: GlacierStateInterface) {
    glacierSimulation = useGlacier(initialData);
    glacierSimulation.glacierState$.subscribe(glacierState$);
    glacierSimulation.startSimulation();

    addSource({ name: 'Glacier', outflowRate$: glacierSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      initializeDam(damState$.getValue()!);
    }

    loggingService.info('Glacier simulation initialized', 'useWaterSystem.initializeGlacier', { glacierId: initialData.id });
  }

  function initializeRiver(initialData: RiverStateInterface) {
    riverSimulation = useRiver(initialData);
    riverSimulation.riverState$.subscribe(riverState$);
    riverSimulation.startSimulation();

    addSource({ name: 'River', outflowRate$: riverSimulation.outflowRate$ });

    if (damSimulation) {
      // Réinitialiser le barrage avec la nouvelle source d'eau
      initializeDam(damState$.getValue()!);
    }

    loggingService.info('River simulation initialized', 'useWaterSystem.initializeRiver', { riverId: initialData.id });
  }

  const systemState$ = combineLatest([
    damState$,
    glacierState$,
    riverState$
  ]).pipe(
    map(([dam, glacier, river]) => ({ dam, glacier, river })),
    catchError(err => {
      loggingService.error('Error in system state', 'useWaterSystem.systemState$', { error: err });
      error$.next(`Error in system state: ${err.message}`);
      return of({ dam: null, glacier: null, river: null });
    }),
    shareReplay(1)
  );

  const totalWaterLevel$ = damState$.pipe(
    switchMap(damState => 
      damState ? of(damState.currentWaterLevel) : of(0)
    ),
    catchError(err => {
      loggingService.error('Error in total water level', 'useWaterSystem.totalWaterLevel$', { error: err });
      error$.next(`Error in total water level: ${err.message}`);
      return of(0);
    }),
    shareReplay(1)
  );

  function cleanup() {
    damSimulation?.cleanup();
    glacierSimulation?.cleanup();
    riverSimulation?.cleanup();
    damState$.complete();
    glacierState$.complete();
    riverState$.complete();
    error$.complete();
    loggingService.info('Water system cleaned up', 'useWaterSystem.cleanup');
  }

  return {
    initializeDam,
    initializeGlacier,
    initializeRiver,
    systemState$,
    totalWaterLevel$,
    cleanup,
    error$
  };
}
