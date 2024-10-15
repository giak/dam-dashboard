import { updateDamState } from '@/domain/dam';
import type { DamInterface } from '@/types/dam/DamInterface';
import { browserConfig } from '@config/browserEnv';
import { BehaviorSubject, Observable, interval, map, shareReplay, distinctUntilChanged, tap } from 'rxjs';

/**
 * @description useDam is a composable function that provides a stream of dam state data.
 * @param {DamInterface} initialData - The initial state of the dam.
 * @returns {Object} An object containing the dam state, current water level, outflow rate, inflow rate, and a cleanup function.
 */
export function useDam(initialData: DamInterface) {
  const damState$ = new BehaviorSubject<DamInterface>(initialData);

  /**
   * @description currentWaterLevel$ is an observable that emits the current water level of the dam.
   * @type {Observable<number>}
   */
  const currentWaterLevel$: Observable<number> = damState$.pipe(
    map(state => state.currentWaterLevel),
    distinctUntilChanged(),
    tap(level => console.log('useDam: Nouveau niveau d\'eau', level)),
    shareReplay(1)
  );

  /**
   * @description outflowRate$ is an observable that emits the outflow rate of the dam.
   * @type {Observable<number>}
   */
  const outflowRate$: Observable<number> = damState$.pipe(
    map(state => state.outflowRate),
    distinctUntilChanged(),
    tap(rate => console.log('useDam: Nouveau débit sortant', rate)),
    shareReplay(1)
  );

  /**
   * @description inflowRate$ is an observable that emits the inflow rate of the dam.
   * @type {Observable<number>}
   */
  const inflowRate$: Observable<number> = damState$.pipe(
    map(state => state.inflowRate),
    distinctUntilChanged(),
    tap(rate => console.log('useDam: Nouveau débit entrant', rate)),
    shareReplay(1)
  );

  /**
   * @description simulateWaterFlow is a function that simulates the water flow in the dam.
   * @returns {void}
   */
  const simulateWaterFlow = () => {
    const currentState = damState$.getValue();
    const updatedState = updateDamState(currentState, browserConfig.updateInterval / 1000, browserConfig.damSurfaceArea);
    damState$.next(updatedState);
  };

  /**
   * @description subscription is a subscription to the interval that calls simulateWaterFlow every browserConfig.updateInterval milliseconds.
   * @type {Subscription}
   */
  const subscription = interval(browserConfig.updateInterval)
    .subscribe(() => simulateWaterFlow());

  /**
   * @description cleanup is a function that unsubscribes from the interval and completes the damState$ observable.
   * @returns {void}
   */
  const cleanup = () => {
    subscription.unsubscribe();
    damState$.complete();
  };

  return {
    damState$,
    currentWaterLevel$,
    outflowRate$,
    inflowRate$,
    cleanup
  };
}
