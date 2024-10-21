import { loggingService } from '@services/loggingService';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map, takeUntil, withLatestFrom } from 'rxjs/operators';
import { computed, onUnmounted, ref } from 'vue';

const SIMULATION_INTERVAL = 1000; // 1 second
const BASE_FLOW_RATE = 10; // Base flow rate in m³/s
const PRECIPITATION_IMPACT_FACTOR = 0.5; // How much precipitation affects flow rate

export function useRiver(
  initialData: RiverStateInterface,
  precipitation$: Observable<number>
) {
  const riverState = ref<RiverStateInterface>(initialData);
  const outflowRate$ = new BehaviorSubject<number>(initialData.flowRate);

  let simulationSubscription: Subscription | null = null;

  const updateRiverState = (precipitationMm: number) => {
    const currentState = riverState.value;
    const adjustedFlowRate = BASE_FLOW_RATE + (precipitationMm * PRECIPITATION_IMPACT_FACTOR);
    
    const newWaterVolume = currentState.waterVolume + (precipitationMm * currentState.catchmentArea / 1000); // Convert mm to m³
    const newFlowRate = adjustedFlowRate;

    riverState.value = {
      ...currentState,
      waterVolume: newWaterVolume,
      flowRate: newFlowRate,
      lastUpdated: new Date()
    };

    outflowRate$.next(newFlowRate);

    loggingService.info('River state updated', 'useRiver', { 
      id: riverState.value.id,
      waterVolume: newWaterVolume,
      flowRate: newFlowRate
    });
  };

  const startSimulation = () => {
    if (simulationSubscription) {
      simulationSubscription.unsubscribe();
    }

    simulationSubscription = interval(SIMULATION_INTERVAL).pipe(
      takeUntil(new Observable(() => () => cleanup())),
      withLatestFrom(precipitation$),
      map(([, precipitation]) => precipitation)
    ).subscribe(updateRiverState);

    loggingService.info('River simulation started', 'useRiver', { id: riverState.value.id });
  };

  const stopSimulation = () => {
    if (simulationSubscription) {
      simulationSubscription.unsubscribe();
      simulationSubscription = null;
      loggingService.info('River simulation stopped', 'useRiver', { id: riverState.value.id });
    }
  };

  const cleanup = () => {
    stopSimulation();
    outflowRate$.complete();
    loggingService.info('River resources cleaned up', 'useRiver', { id: riverState.value.id });
  };

  onUnmounted(cleanup);

  return {
    riverState: computed(() => riverState.value),
    outflowRate$: outflowRate$.asObservable(),
    startSimulation,
    stopSimulation,
    cleanup
  };
}
