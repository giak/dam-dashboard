import { useDam } from '@composables/dam/useDam';
import type { DamInterface } from '@/types/dam/DamInterface';
import { computed, ref } from 'vue';

export function useWaterSystem() {
  const dam = ref<ReturnType<typeof useDam> | null>(null);

  const initializeDam = (damData: DamInterface) => {
    console.log('useWaterSystem: Initialisation du barrage avec', damData);
    dam.value = useDam(damData);
  };

  const systemState = computed(() => dam.value?.damState);

  const totalWaterLevel = computed(() => dam.value?.currentWaterLevel || 0);

  const cleanup = () => {
    console.log('useWaterSystem: Nettoyage');
    // Aucune opération de nettoyage n'est nécessaire car useDam gère son propre nettoyage
  };

  return {
    initializeDam,
    systemState,
    totalWaterLevel,
    cleanup
  };
}
