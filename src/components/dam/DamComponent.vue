<template>
  <div class="bg-white shadow-sm border border-gray-200 p-4 max-w-sm">
    <h2 v-once class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ damState.name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <div class="space-y-2">
        <div v-memo="[damState.currentWaterLevel, previousDamState?.currentWaterLevel]" class="border-l-2 border-blue-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Niveau d'eau actuel</p>
          <div class="flex items-center justify-between">
            <p class="text-2xl font-bold text-blue-600">{{ damState.currentWaterLevel.toFixed(4) }} m</p>
            <TrendIndicator
              :currentValue="damState.currentWaterLevel"
              :previousValue="previousDamState?.currentWaterLevel ?? null"
              upColor="text-red-500"
              downColor="text-green-500"
              stableColor="text-gray-500"
            />
          </div>
        </div>
        <div v-memo="[damState.outflowRate, previousDamState?.outflowRate]" class="border-l-2 border-green-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Débit sortant</p>
          <div class="flex items-center justify-between">
            <p class="text-xl font-bold text-gray-600">{{ damState.outflowRate.toFixed(2) }} m³/s</p>
            <TrendIndicator
              :currentValue="damState.outflowRate"
              :previousValue="previousDamState?.outflowRate ?? null"
            />
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div v-memo="[damState.inflowRate, previousDamState?.inflowRate]" class="border-l-2 border-orange-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-2">Débit entrant</p>
          <div class="flex items-center justify-between">
            <p class="text-xl font-bold text-gray-600">{{ damState.inflowRate.toFixed(2) }} m³/s</p>
            <TrendIndicator
              :currentValue="damState.inflowRate"
              :previousValue="previousDamState?.inflowRate ?? null"
            />
          </div>
        </div>
        <div v-memo="[formattedLastUpdate]" class="border-l-2 border-purple-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
          <p class="text-sm text-gray-600">{{ formattedLastUpdate }}</p>
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
import TrendIndicator from "@/components/common/TrendIndicator.vue";
import type { DamInterface } from "@/types/dam/DamInterface";
import { format, parseISO } from "date-fns";
import { computed, ref, watch } from "vue";
import WaterLevelChart from "./WaterLevelChart.vue";

interface PropsInterface {
  damState: DamInterface;
}

const props = defineProps<PropsInterface>();

// Référence pour stocker l'état précédent
const previousDamState = ref<DamInterface | null>(null);

// Watcher pour mettre à jour l'état précédent lorsque damState change
watch(() => props.damState, (newState, oldState) => {
  if (oldState) {
    previousDamState.value = { ...oldState };
  }
}, { deep: true, immediate: true });

const formattedLastUpdate = computed(() => 
  format(parseISO(props.damState.lastUpdated.toISOString()), "dd MMM yyyy HH:mm:ss")
);
</script>
