import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';
import { updateDamState, validateDamUpdate } from '@utils/dam/damUtils';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { errorHandlingService } from './errorHandlingService';
import { loggingService } from './loggingService';

export interface DamServiceInterface {
  getDamState$: () => Observable<DamInterface>;
  getCurrentWaterLevel$: () => Observable<number>;
  updateDam: (update: DamUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createDamService(initialData: DamInterface, aggregatedInflow$: Observable<number>): DamServiceInterface {
  const damState$ = new BehaviorSubject<DamInterface>(initialData);

  const updateDam = (update: DamUpdateInterface): void => {
    try {
      validateDamUpdate(update);
      const currentState = damState$.getValue();
      const newState = { ...currentState, ...update, lastUpdated: new Date() };
      damState$.next(newState);
      loggingService.info('Dam state updated', 'DamService', { newState });
    } catch (error) {
      errorHandlingService.emitError({
        message: 'Error updating dam state',
        timestamp: Date.now(),
        context: 'DamService.updateDam',
        data: { error, update }
      });
    }
  };

  const startSimulation = (): (() => void) => {
    const subscription = aggregatedInflow$.subscribe(inflow => {
      const currentState = damState$.getValue();
      const newState = updateDamState(currentState, 1000, inflow);
      damState$.next(newState);
    });

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    damState$.complete();
  };

  return {
    getDamState$: () => damState$.asObservable(),
    getCurrentWaterLevel$: () => damState$.pipe(map(state => state.currentWaterLevel)),
    updateDam,
    startSimulation,
    cleanup
  };
}
