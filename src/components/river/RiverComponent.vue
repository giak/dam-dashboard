<template>
  <div class="river-component bg-white shadow-sm border border-gray-200 p-4 max-w-sm">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ riverState.name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <div class="space-y-2">
        <div class="border-l-2 border-blue-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Débit actuel</p>
          <div class="flex items-center justify-between">
            <p class="text-xl font-bold text-blue-600">{{ riverState.flowRate.toFixed(2) }} m³/s</p>
            <TrendIndicator
              :currentValue="riverState.flowRate"
              :previousValue="previousFlowRate"
              upColor="text-blue-500"
              downColor="text-red-500"
              stableColor="text-gray-500"
            />
          </div>
        </div>
        <div class="border-l-2 border-green-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Volume d'eau</p>
          <div class="flex items-center justify-between">
            <p class="text-lg font-bold text-gray-600">{{ riverState.waterVolume.toFixed(2) }} m³</p>
            <TrendIndicator
              :currentValue="riverState.waterVolume"
              :previousValue="previousWaterVolume"
            />
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="border-l-2 border-purple-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
          <p class="text-sm text-gray-600">{{ formattedLastUpdate }}</p>
        </div>
        <div class="border-l-2 border-orange-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Précipitations actuelles</p>
          <p class="text-lg font-bold text-gray-600">{{ currentPrecipitation.toFixed(2) }} mm/h</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TrendIndicator from "@components/common/TrendIndicator.vue";
import type { RiverStateInterface } from "@type/river/RiverStateInterface";
import { format, parseISO } from "date-fns";
import { computed, ref, watch } from "vue";

interface PropsInterface {
  riverState: RiverStateInterface;
  currentPrecipitation: number;
}

const props = defineProps<PropsInterface>();

const previousFlowRate = ref<number | null>(null);
const previousWaterVolume = ref<number | null>(null);

watch(() => props.riverState, (newState, oldState) => {
  if (oldState) {
    previousFlowRate.value = oldState.flowRate;
    previousWaterVolume.value = oldState.waterVolume;
  }
}, { deep: true, immediate: true });

const formattedLastUpdate = computed(() => 
  format(parseISO(props.riverState.lastUpdated.toISOString()), "dd MMM yyyy HH:mm:ss")
);
</script>
