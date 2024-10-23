import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { updateDamState, validateDamUpdate } from '@utils/dam/damUtils';
import { BehaviorSubject, Observable, asyncScheduler, distinctUntilChanged } from 'rxjs';
import { map, observeOn, shareReplay, tap } from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

export interface DamServiceInterface {
  getDamState$: () => Observable<DamInterface>;
  getCurrentWaterLevel$: () => Observable<number>;
  updateDam: (update: DamUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamService(
  initialData: DamInterface, 
  aggregatedInflow$: Observable<number>
): DamServiceInterface {
  // État principal avec optimisation des émissions et scheduler
  const damState$ = new BehaviorSubject<DamInterface>(initialData);

  // Flux d'état partagé avec optimisation et scheduler
  const sharedDamState$ = damState$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.currentWaterLevel === curr.currentWaterLevel &&
      prev.inflowRate === curr.inflowRate &&
      prev.outflowRate === curr.outflowRate
    ),
    shareReplay(1)
  );

  // Flux de niveau d'eau optimisé avec scheduler
  const currentWaterLevel$ = sharedDamState$.pipe(
    observeOn(asyncScheduler),
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const updateDam = (update: DamUpdateInterface): void => {
    // Déplacer la mise à jour vers asyncScheduler
    asyncScheduler.schedule(() => {
      try {
        validateDamUpdate(update);
        const currentState = damState$.getValue();
        const newState = { 
          ...currentState, 
          ...update, 
          lastUpdated: new Date() 
        };
        damState$.next(newState);
        
        // Logging asynchrone
        asyncScheduler.schedule(() => {
          loggingService.info('Dam state updated', 'DamService', { newState });
        });
      } catch (error) {
        // Gestion d'erreur asynchrone
        asyncScheduler.schedule(() => {
          errorHandlingService.emitError({
            message: 'Error updating dam state',
            timestamp: Date.now(),
            context: 'DamService.updateDam',
            data: { error, update }
          });
        });
      }
    });
  };

  const startSimulation = (): (() => void) => {
    // Optimisation du flux d'entrée avec scheduler
    const simulation$ = aggregatedInflow$.pipe(
      observeOn(asyncScheduler),
      distinctUntilChanged(),
      tap(inflow => {
        asyncScheduler.schedule(() => {
          loggingService.info('Processing inflow update', 'DamService', { inflow });
        });
      }),
      shareReplay(1)
    );

    const subscription = simulation$.subscribe(inflow => {
      asyncScheduler.schedule(() => {
        const currentState = damState$.getValue();
        const newState = updateDamState(currentState, 1000, inflow);
        damState$.next(newState);
      });
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    asyncScheduler.schedule(() => {
      damState$.complete();
      loggingService.info('Dam service cleaned up', 'DamService');
    });
  };

  return {
    getDamState$: () => sharedDamState$,
    getCurrentWaterLevel$: () => currentWaterLevel$,
    updateDam,
    startSimulation,
    cleanup
  };
}
