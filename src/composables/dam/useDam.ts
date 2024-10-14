import type { DamInterface } from '@/types/dam/DamInterface';
import { browserConfig } from '@config/browserEnv';
import { ref, computed } from 'vue';
import { updateDamState } from '@/utils/hydraulicCalculations';

export function useDam(initialData: DamInterface) {
  const damState = ref<DamInterface>(initialData);

  const currentWaterLevel = computed(() => damState.value.currentWaterLevel);
  const outflowRate = computed(() => damState.value.outflowRate);
  const inflowRate = computed(() => damState.value.inflowRate);

  const simulateWaterFlow = () => {
    damState.value = updateDamState(damState.value, browserConfig.updateInterval / 1000, browserConfig.damSurfaceArea);
    console.log('useDam: État mis à jour', damState.value);
  };

  const intervalId = setInterval(simulateWaterFlow, browserConfig.updateInterval);

  const cleanup = () => {
    clearInterval(intervalId);
  };

  return {
    damState,
    currentWaterLevel,
    outflowRate,
    inflowRate,
    cleanup,
  };
}
