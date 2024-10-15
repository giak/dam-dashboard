import type { DamInterface } from '@/types/dam/DamInterface';
import { useDam } from '@composables/dam/useDam';
import { BehaviorSubject, Observable, shareReplay, switchMap, distinctUntilChanged, tap } from 'rxjs';

/**
 * @description useWaterSystem is a composable function that provides a stream of dam state data.
 * @returns {Object} An object containing the dam state, current water level, outflow rate, inflow rate, and a cleanup function.
 */
export function useWaterSystem() {
  /**
   * @description dam$ is a BehaviorSubject that emits the dam instance.
   * @type {BehaviorSubject<ReturnType<typeof useDam> | null>}
   */
  const dam$ = new BehaviorSubject<ReturnType<typeof useDam> | null>(null);

  /**
   * @description initializeDam is a function that initializes the dam instance.
   * @param {DamInterface} damData - The initial state of the dam.
   * @returns {void}
   */
  const initializeDam = (damData: DamInterface) => {
    console.log('useWaterSystem: Initialisation du barrage avec', damData);
    const damInstance = useDam(damData);
    dam$.next(damInstance);
  };

  /**
   * @description systemState$ is an observable that emits the dam state.
   * @type {Observable<DamInterface | null>}
   */
  const systemState$: Observable<DamInterface | null> = dam$.pipe(
    switchMap(dam => dam?.damState$ ?? new BehaviorSubject(null)),
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
    tap(state => console.log('useWaterSystem: Nouvel état du système', state)),
    shareReplay(1)
  );

  /**
   * @description totalWaterLevel$ is an observable that emits the total water level.
   * @type {Observable<number>}
   */
  const totalWaterLevel$: Observable<number> = dam$.pipe(
    switchMap(dam => dam?.currentWaterLevel$ ?? new BehaviorSubject(0)),
    distinctUntilChanged(),
    tap(level => console.log('useWaterSystem: Nouveau niveau d\'eau total', level)),
    shareReplay(1)
  );

  /**
   * @description cleanup is a function that unsubscribes from the dam instance and completes the dam$ observable.
   * @returns {void}
   */
  const cleanup = () => {
    console.log('useWaterSystem: Nettoyage');
    dam$.getValue()?.cleanup();
    dam$.complete();
  };

  return {
    initializeDam,
    systemState$,
    totalWaterLevel$,
    cleanup
  };
}
