import { useDam } from '@composables/dam/useDam';
import type { DamInterface } from '@/types/dam/DamInterface';
import { computed, ref, watch } from 'vue';

export function useWaterSystem() {
  const dam = ref<ReturnType<typeof useDam> | null>(null);

  const initializeDam = (damData: DamInterface) => {
    console.log('useWaterSystem: Initialisation du barrage avec', damData);
    dam.value = useDam(damData);
  };

  const systemState = computed(() => dam.value?.damState);

  const totalWaterLevel = computed(() => dam.value?.currentWaterLevel || 0);

  watch(systemState, (newState) => {
    console.log('useWaterSystem: Nouvel état du système', newState);
  }, { deep: true });

  const cleanup = () => {
    console.log('useWaterSystem: Nettoyage');
    dam.value?.cleanup();
  };

  return {
    initializeDam,
    systemState,
    totalWaterLevel,
    cleanup
  };
}
