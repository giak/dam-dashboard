import type { GlacierStateInterface } from '@services/glacierSimulation';
import { loggingService } from '@services/loggingService';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map, takeUntil, withLatestFrom } from 'rxjs/operators';
import { computed, onUnmounted, ref } from 'vue';

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_MELT_RATE = 0.1; // Base melt rate in m³/s
const TEMPERATURE_IMPACT_FACTOR = 0.05; // How much temperature affects melt rate

export function useGlacier(
  initialData: GlacierStateInterface,
  temperature$: Observable<number>
) {
  const glacierState = ref<GlacierStateInterface>(initialData);
  const outflowRate$ = new BehaviorSubject<number>(initialData.outflowRate);

  let simulationSubscription: Subscription | null = null;

  const updateGlacierState = (temperatureCelsius: number) => {
    const currentState = glacierState.value;
    const adjustedMeltRate = BASE_MELT_RATE + (temperatureCelsius * TEMPERATURE_IMPACT_FACTOR);
    
    const newVolume = Math.max(0, currentState.volume - adjustedMeltRate * SIMULATION_INTERVAL / 1000);
    const newOutflowRate = adjustedMeltRate * (newVolume / currentState.volume);

    glacierState.value = {
      ...currentState,
      volume: newVolume,
      meltRate: adjustedMeltRate,
      outflowRate: newOutflowRate,
      lastUpdated: new Date()
    };

    outflowRate$.next(newOutflowRate);

    loggingService.info('Glacier state updated', 'useGlacier', { 
      id: glacierState.value.id,
      volume: newVolume,
      meltRate: adjustedMeltRate,
      outflowRate: newOutflowRate
    });
  };

  const startSimulation = () => {
    if (simulationSubscription) {
      simulationSubscription.unsubscribe();
    }

    simulationSubscription = interval(SIMULATION_INTERVAL).pipe(
      takeUntil(new Observable(() => () => cleanup())),
      withLatestFrom(temperature$),
      map(([, temperature]) => temperature)
    ).subscribe(updateGlacierState);

    loggingService.info('Glacier simulation started', 'useGlacier', { id: glacierState.value.id });
  };

  const stopSimulation = () => {
    if (simulationSubscription) {
      simulationSubscription.unsubscribe();
      simulationSubscription = null;
      loggingService.info('Glacier simulation stopped', 'useGlacier', { id: glacierState.value.id });
    }
  };

  const cleanup = () => {
    stopSimulation();
    outflowRate$.complete();
    loggingService.info('Glacier resources cleaned up', 'useGlacier', { id: glacierState.value.id });
  };

  onUnmounted(cleanup);

  return {
    glacierState: computed(() => glacierState.value),
    outflowRate$: outflowRate$.asObservable(),
    startSimulation,
    stopSimulation,
    cleanup
  };
}
