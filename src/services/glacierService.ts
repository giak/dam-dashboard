import type { GlacierStateInterface, GlacierUpdateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import { BehaviorSubject, Observable, asyncScheduler, distinctUntilChanged, interval } from 'rxjs';
import { map, observeOn, shareReplay, tap, withLatestFrom } from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

// Constantes pour la simulation
const SIMULATION_INTERVAL = 1000; // 1 seconde en millisecondes
const BASE_MELT_RATE = 0.1; // Taux de fonte de base en m³/s
const TEMPERATURE_IMPACT_FACTOR = 0.05; // Facteur d'impact de la température

export interface GlacierServiceInterface {
  getGlacierState$: () => Observable<GlacierStateInterface>;
  getOutflowRate$: () => Observable<number>;
  updateGlacier: (update: GlacierUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createGlacierService(
  initialData: GlacierStateInterface, 
  temperature$: Observable<number>
): GlacierServiceInterface {
  // État principal avec optimisation des émissions et scheduler
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialData);

  // Flux d'état partagé avec optimisation et scheduler
  const sharedGlacierState$ = glacierState$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.outflowRate === curr.outflowRate && 
      prev.volume === curr.volume &&
      prev.meltRate === curr.meltRate
    ),
    shareReplay(1)
  );

  // Flux de débit optimisé avec scheduler
  const outflowRate$ = sharedGlacierState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.outflowRate),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const updateGlacier = (update: GlacierUpdateInterface): void => {
    // Déplacer la mise à jour vers asyncScheduler
    asyncScheduler.schedule(() => {
      try {
        const currentState = glacierState$.getValue();
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        glacierState$.next(newState);
        
        // Logging asynchrone
        asyncScheduler.schedule(() => {
          loggingService.info('Glacier state updated', 'GlacierService', { newState });
        });
      } catch (error) {
        // Gestion d'erreur asynchrone
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating glacier state',
            timestamp: Date.now(),
            context: 'GlacierService.updateGlacier',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    // Optimisation du flux de simulation avec scheduler
    const simulation$ = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      observeOn(asyncScheduler),
      withLatestFrom(temperature$),
      map(([, temperature]) => temperature),
      distinctUntilChanged(),
      tap(temperature => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing temperature update', 'GlacierService', { temperature });
        });
      }),
      shareReplay(1)
    );

    const subscription = simulation$.subscribe(temperature => {
      asyncScheduler.schedule(() => {
        const currentState = glacierState$.getValue();
        const newState = updateGlacierState(
          currentState,
          temperature,
          SIMULATION_INTERVAL / 1000,
          BASE_MELT_RATE,
          TEMPERATURE_IMPACT_FACTOR
        );
        glacierState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    asyncScheduler.schedule(() => {
      glacierState$.complete();
      loggingService.info('Glacier service cleaned up', 'GlacierService');
    });
  };

  return {
    getGlacierState$: () => sharedGlacierState$,
    getOutflowRate$: () => outflowRate$,
    updateGlacier,
    startSimulation,
    cleanup
  };
}
