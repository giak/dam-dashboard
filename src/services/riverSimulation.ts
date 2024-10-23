import type { RiverStateInterface } from '@type/river/RiverInterface';
import { updateRiverState } from '@utils/river/riverUtils';
import { asyncScheduler, BehaviorSubject, interval, Observable } from 'rxjs';
import { distinctUntilChanged, map, observeOn, share, tap, withLatestFrom } from 'rxjs/operators';
import { loggingService } from "./loggingService";

export interface RiverSimulationInterface {
  riverState$: Observable<RiverStateInterface>;
  outflowRate$: Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
  updateState: (precipitationMm: number) => void;
}

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_FLOW_RATE = 10; // Base flow rate in m³/s
const PRECIPITATION_IMPACT_FACTOR = 0.5; // How much precipitation affects flow rate

export function createRiverSimulation(
  initialState: RiverStateInterface,
  precipitation$: Observable<number>
): RiverSimulationInterface {
  const riverState = new BehaviorSubject<RiverStateInterface>(initialState);
  const outflowRate = new BehaviorSubject<number>(initialState.flowRate);

  // Optimisation : Partage du flux d'état avec scheduler
  const sharedRiverState$ = riverState.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.flowRate === curr.flowRate && 
      prev.waterVolume === curr.waterVolume
    ),
    share()
  );

  // Optimisation : Partage du flux de débit avec scheduler
  const sharedOutflowRate$ = outflowRate.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    share()
  );

  const updateRiverStateInternal = (precipitationMm: number) => {
    // Déplacer les calculs et validations vers asyncScheduler
    asyncScheduler.schedule(() => {
      const currentState = riverState.getValue();
      
      // Validation existante
      if (typeof currentState.flowRate !== 'number' || isNaN(currentState.flowRate)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Invalid flowRate:', "RiverSimulation", { error: 'Invalid flowRate' });
        });
        return;
      }

      const newState = updateRiverState(
        currentState,
        precipitationMm,
        SIMULATION_INTERVAL / 1000,
        BASE_FLOW_RATE,
        PRECIPITATION_IMPACT_FACTOR
      );

      if (isNaN(newState.flowRate)) {
        asyncScheduler.schedule(() => {
          loggingService.error('Calculated flow rate is NaN', "RiverSimulation");
        });
        return;
      }

      // Logging asynchrone
      asyncScheduler.schedule(() => {
        loggingService.info('New river state:', "RiverSimulation", {
          flowRate: newState.flowRate,
          waterVolume: newState.waterVolume
        });
      });

      outflowRate.next(newState.flowRate);
      riverState.next(newState);
    });
  };

  const startSimulation = () => {
    loggingService.info("River simulation started", "RiverSimulation");
    
    // Création du flux de simulation avec scheduler
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation),
      tap(precipitation => {
        asyncScheduler.schedule(() => {
          loggingService.info("Processing precipitation", "RiverSimulation", { precipitation });
        });
      })
    );

    const subscription = simulation$.subscribe(updateRiverStateInternal);
    return () => subscription.unsubscribe();
  };

  const cleanup = () => {
    asyncScheduler.schedule(() => {
      loggingService.info("Cleaning up river simulation", "RiverSimulation");
      riverState.complete();
      outflowRate.complete();
    });
  };

  return {
    riverState$: sharedRiverState$,
    outflowRate$: sharedOutflowRate$,
    startSimulation,
    cleanup,
    updateState: updateRiverStateInternal
  };
}
