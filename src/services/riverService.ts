import type { RiverStateInterface, RiverUpdateInterface } from '@type/river/RiverInterface';
import { updateRiverState } from '@utils/river/riverUtils';
import { BehaviorSubject, Observable, asyncScheduler, distinctUntilChanged, interval } from 'rxjs';
import { map, observeOn, shareReplay, tap, withLatestFrom } from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

// Constantes pour la simulation
const SIMULATION_INTERVAL = 1000; // 1 seconde en millisecondes
const BASE_FLOW_RATE = 10; // Débit de base en m³/s
const PRECIPITATION_IMPACT_FACTOR = 0.5; // Facteur d'impact des précipitations

export interface RiverServiceInterface {
  getRiverState$: () => Observable<RiverStateInterface>;
  getOutflowRate$: () => Observable<number>;
  updateRiver: (update: RiverUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createRiverService(
  initialData: RiverStateInterface, 
  precipitation$: Observable<number>
): RiverServiceInterface {
  // Optimisation : Utilisation de shareReplay pour partager l'état avec scheduler
  const riverState$ = new BehaviorSubject<RiverStateInterface>(initialData);
  
  // Optimisation : Flux partagé avec distinctUntilChanged et scheduler
  const sharedRiverState$ = riverState$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.flowRate === curr.flowRate && 
      prev.waterVolume === curr.waterVolume
    ),
    shareReplay(1)
  );

  // Optimisation : Flux de débit partagé avec scheduler
  const outflowRate$ = sharedRiverState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.flowRate),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const updateRiver = (update: RiverUpdateInterface): void => {
    // Déplacer la mise à jour vers asyncScheduler
    asyncScheduler.schedule(() => {
      try {
        const currentState = riverState$.getValue();
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        riverState$.next(newState);
        
        // Logging asynchrone
        asyncScheduler.schedule(() => {
          loggingService.info('River state updated', 'RiverService', { newState });
        });
      } catch (error) {
        // Gestion d'erreur asynchrone
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating river state',
            timestamp: Date.now(),
            context: 'RiverService.updateRiver',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    // Optimisation : Création d'un flux de simulation partagé avec scheduler
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation),
      tap(precipitation => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing precipitation', 'RiverService', { precipitation });
        });
      }),
      shareReplay(1)
    );

    const subscription = simulation$.subscribe(precipitation => {
      asyncScheduler.schedule(() => {
        const currentState = riverState$.getValue();
        const newState = updateRiverState(
          currentState,
          precipitation,
          SIMULATION_INTERVAL / 1000,
          BASE_FLOW_RATE,
          PRECIPITATION_IMPACT_FACTOR
        );
        riverState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    asyncScheduler.schedule(() => {
      riverState$.complete();
      loggingService.info('River service cleaned up', 'RiverService');
    });
  };

  return {
    getRiverState$: () => sharedRiverState$,
    getOutflowRate$: () => outflowRate$,
    updateRiver,
    startSimulation,
    cleanup
  };
}
