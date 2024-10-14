<template>
  <div class="dam-component">
    <h2 class="text-2xl font-bold mb-4">{{ damState.name }}</h2>
    <div class="grid grid-cols-2 gap-4">
      <div class="stat-item">
        <span class="font-semibold">Niveau d'eau actuel:</span>
        <span>{{ currentWaterLevel.toFixed(4) }} m</span>
      </div>
      <div class="stat-item">
        <span class="font-semibold">Débit sortant:</span>
        <span>{{ outflowRate.toFixed(2) }} m³/s</span>
      </div>
      <div class="stat-item">
        <span class="font-semibold">Débit entrant:</span>
        <span>{{ inflowRate.toFixed(2) }} m³/s</span>
      </div>
      <div class="stat-item">
        <span class="font-semibold">Dernière mise à jour:</span>
        <span>{{ new Date(damState.lastUpdated).toLocaleString() }}</span>
      </div>
    </div>
    <WaterLevelChart :currentWaterLevel="currentWaterLevel" />
  </div>
</template>

<script setup lang="ts">
import type { DamInterface } from '@/types/dam/DamInterface';
import { useDam } from '@composables/dam/useDam';
import { onMounted, onUnmounted, watch } from 'vue';
import WaterLevelChart from './WaterLevelChart.vue';

const props = defineProps<{
  initialData: DamInterface;
}>();

const { damState, currentWaterLevel, outflowRate, inflowRate, cleanup } = useDam(props.initialData);

watch(() => damState.value, (newState) => {
  console.log('DamComponent: Nouvel état du barrage:', newState);
}, { deep: true });

onMounted(() => {
  console.log('DamComponent: Composant monté');
});

onUnmounted(() => {
  console.log('DamComponent: Composant démonté');
  cleanup();
});
</script>

<style scoped>
.dam-component {
  @apply bg-white shadow-md rounded-lg p-6;
}

.stat-item {
  @apply flex justify-between items-center;
}
</style>
