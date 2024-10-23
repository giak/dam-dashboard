import type { DamInterface } from '@type/dam/DamInterface';
import { BehaviorSubject, Observable, asyncScheduler, interval } from 'rxjs';
import { distinctUntilChanged, observeOn, share, shareReplay, tap } from 'rxjs/operators';
import { loggingService } from "./loggingService";

export interface DamSimulationInterface {
  damState$: Observable<DamInterface>;
  currentWaterLevel$: Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamSimulation(initialState: DamInterface): DamSimulationInterface {
  const damState = new BehaviorSubject<DamInterface>(initialState);
  const currentWaterLevel = new BehaviorSubject<number>(initialState.currentWaterLevel);

  // Optimisation : Flux d'état partagé avec scheduler
  const sharedDamState$ = damState.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.currentWaterLevel === curr.currentWaterLevel &&
      prev.inflowRate === curr.inflowRate &&
      prev.outflowRate === curr.outflowRate
    ),
    shareReplay(1)
  );

  // Optimisation : Flux de niveau d'eau partagé avec scheduler
  const sharedWaterLevel$ = currentWaterLevel.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const updateWaterLevel = () => {
    // Déplacer les calculs et validations vers asyncScheduler
    asyncScheduler.schedule(() => {
      const currentState = damState.getValue();
      
      // Logging asynchrone de l'état actuel
      asyncScheduler.schedule(() => {
        loggingService.info("Current state:", "DamSimulation", { state: currentState });
      });

      // Validation des valeurs
      if (typeof currentState.currentWaterLevel !== 'number' || isNaN(currentState.currentWaterLevel)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid currentWaterLevel:', "DamSimulation", { error: 'Invalid currentWaterLevel' });
        });
        return;
      }

      if (typeof currentState.maxWaterLevel !== 'number' || isNaN(currentState.maxWaterLevel)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid maxWaterLevel:', "DamSimulation", { error: 'Invalid maxWaterLevel' });
        });
        return;
      }

      // Simuler les changements de débits de manière asynchrone
      const inflowChange = (Math.random() - 0.5) * 2;
      const outflowChange = (Math.random() - 0.5) * 2;

      const newInflowRate = Math.max(0, currentState.inflowRate + inflowChange);
      const newOutflowRate = Math.max(0, currentState.outflowRate + outflowChange);

      // Calculer le changement net du niveau d'eau
      const netChange = (newInflowRate - newOutflowRate) / 100;

      const newWaterLevel = Math.max(
        currentState.minWaterLevel,
        Math.min(currentState.currentWaterLevel + netChange, currentState.maxWaterLevel)
      );

      if (isNaN(newWaterLevel)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Calculated water level is NaN', "DamSimulation", { error: 'Calculated water level is NaN' });
        });
        return;
      }

      // Logging asynchrone du nouvel état
      asyncScheduler.schedule(() => {
        loggingService.info('New state:', "DamSimulation", {
          waterLevel: newWaterLevel,
          inflowRate: newInflowRate,
          outflowRate: newOutflowRate
        });
      });

      currentWaterLevel.next(newWaterLevel);
      damState.next({
        ...currentState,
        currentWaterLevel: newWaterLevel,
        inflowRate: newInflowRate,
        outflowRate: newOutflowRate,
        lastUpdated: new Date()
      });
    });
  };

  const startSimulation = () => {
    asyncScheduler.schedule(() => {
      loggingService.info("Simulation started", "DamSimulation");
    });

    // Création du flux de simulation avec scheduler
    const simulation$ = interval(1000, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      tap(() => {
        asyncScheduler.schedule(() => {
          loggingService.info("Processing simulation update", "DamSimulation");
        });
      }),
      share()
    );

    const subscription = simulation$.subscribe(updateWaterLevel);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    asyncScheduler.schedule(() => {
      loggingService.info("Cleaning up simulation", "DamSimulation");
      damState.complete();
      currentWaterLevel.complete();
    });
  };

  return {
    damState$: sharedDamState$,
    currentWaterLevel$: sharedWaterLevel$,
    startSimulation,
    cleanup
  };
}
