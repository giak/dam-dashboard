import type { GlacierStateInterface } from '@type/glacier/GlacierInterface';
import { updateGlacierState } from '@utils/glacier/glacierUtils';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_MELT_RATE = 0.1; // Base melt rate in m³/s
const TEMPERATURE_IMPACT_FACTOR = 0.05; // How much temperature affects melt rate

export function createGlacierSimulation(
  initialState: GlacierStateInterface,
  temperature$: Observable<number>
) {
  const glacierState$ = new BehaviorSubject<GlacierStateInterface>(initialState);

  const simulation$ = interval(SIMULATION_INTERVAL).pipe(
    withLatestFrom(temperature$),
    map(([, temperature]) => temperature)
  );

  const updateState = (temperatureCelsius: number) => {
    const currentState = glacierState$.getValue();
    const newState = updateGlacierState(
      currentState,
      temperatureCelsius,
      SIMULATION_INTERVAL,
      BASE_MELT_RATE,
      TEMPERATURE_IMPACT_FACTOR
    );
    glacierState$.next(newState);
  };

  return {
    glacierState$,
    simulation$,
    updateState
  };
}
