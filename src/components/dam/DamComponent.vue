<template>
  <div class="bg-white shadow-sm border border-gray-200 p-4 max-w-sm mx-auto">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ damState.name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <div class="space-y-2">
        <div class="border-l-2 border-blue-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Niveau d'eau actuel</p>
          <p class="text-2xl font-bold text-blue-600">{{ damState.currentWaterLevel.toFixed(4) }} m</p>
        </div>
        <div class="border-l-2 border-green-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Débit sortant</p>
          <p class="text-2xl font-bold text-green-600">{{ damState.outflowRate.toFixed(2) }} m³/s</p>
        </div>
      </div>
      <div class="space-y-2">
        <div class="border-l-2 border-orange-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Débit entrant</p>
          <p class="text-2xl font-bold text-orange-600">{{ damState.inflowRate.toFixed(2) }} m³/s</p>
        </div>
        <div class="border-l-2 border-purple-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
          <p class="text-base text-gray-600">{{ formattedLastUpdate }}</p>
        </div>
      </div>
    </div>
    <WaterLevelChart 
      :currentWaterLevel="damState.currentWaterLevel"
      :maxWaterLevel="damState.maxWaterLevel"
      :minWaterLevel="damState.minWaterLevel"
    />
  </div>
</template>

<script setup lang="ts">
import type { DamInterface } from "@/types/dam/DamInterface";
import { format, parseISO } from 'date-fns';
import { computed } from "vue";
import WaterLevelChart from "./WaterLevelChart.vue";

interface Props {
  damState: DamInterface;
}

const props = defineProps<Props>();

const formattedLastUpdate = computed(() => format(parseISO(props.damState.lastUpdated.toISOString()), "dd MMM yyyy HH:mm:ss"));
</script>

