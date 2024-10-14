import { updateDamState } from '@/domain/dam';
import type { DamInterface } from '@/types/dam/DamInterface';
import { browserConfig } from '@config/browserEnv';
import { computed, onUnmounted, reactive } from 'vue';

export function useDam(initialData: DamInterface) {
  const damState = reactive<DamInterface>(initialData);

  const currentWaterLevel = computed(() => damState.currentWaterLevel);
  const outflowRate = computed(() => damState.outflowRate);
  const inflowRate = computed(() => damState.inflowRate);

  const simulateWaterFlow = () => {
    const updatedState = updateDamState(damState, browserConfig.updateInterval / 1000, browserConfig.damSurfaceArea);
    Object.assign(damState, updatedState);
    console.log('useDam: État mis à jour', damState);
  };

  const intervalId = setInterval(simulateWaterFlow, browserConfig.updateInterval);

  onUnmounted(() => {
    clearInterval(intervalId);
  });

  return {
    damState,
    currentWaterLevel,
    outflowRate,
    inflowRate,
  };
}
