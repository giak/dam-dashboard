<template>
  <div class="dam-component">
    <h2 class="text-2xl font-bold mb-4">{{ damState.name }}</h2>
    <div class="grid grid-cols-2 gap-4 mb-4">
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
        <span>{{ formattedLastUpdate }}</span>
      </div>
    </div>
    <WaterLevelChart :currentWaterLevel="currentWaterLevel" />
  </div>
</template>

<script setup lang="ts">
import type { DamInterface } from '@/types/dam/DamInterface';
import { useDam } from '@composables/dam/useDam';
import { computed } from 'vue';
import WaterLevelChart from './WaterLevelChart.vue';


const props = defineProps<{
  initialData: DamInterface;
}>();

const { damState, currentWaterLevel, outflowRate, inflowRate } = useDam(props.initialData);

const formattedLastUpdate = computed(() => new Date(damState.lastUpdated).toLocaleString());
</script>

<style scoped>
.dam-component {
  @apply bg-white shadow-md rounded-lg p-6;
}

.stat-item {
  @apply flex justify-between items-center;
}
</style>
