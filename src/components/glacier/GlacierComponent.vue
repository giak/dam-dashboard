<template>
  <div class="glacier-component bg-white shadow-sm border border-gray-200 p-4 max-w-sm">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ glacierState.name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <div class="space-y-2">
        <div class="border-l-2 border-blue-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Volume actuel</p>
          <div class="flex items-center justify-between">
            <p class="text-xl font-bold text-blue-600">{{ glacierState.volume.toFixed(2) }} m³</p>
            <TrendIndicator
              :currentValue="glacierState.volume"
              :previousValue="previousVolume"
              upColor="text-blue-500"
              downColor="text-red-500"
              stableColor="text-gray-500"
            />
          </div>
        </div>
        <div class="border-l-2 border-green-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Taux de fonte</p>
          <div class="flex items-center justify-between">
            <p class="text-lg font-bold text-gray-600">{{ glacierState.meltRate.toFixed(4) }} m³/s</p>
            <TrendIndicator
              :currentValue="glacierState.meltRate"
              :previousValue="previousMeltRate"
            />
          </div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="border-l-2 border-orange-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-2">Débit sortant</p>
          <div class="flex items-center justify-between">
            <p class="text-lg font-bold text-gray-600">{{ glacierState.outflowRate.toFixed(4) }} m³/s</p>
            <TrendIndicator
              :currentValue="glacierState.outflowRate"
              :previousValue="previousOutflowRate"
            />
          </div>
        </div>
        <div class="border-l-2 border-purple-500 pl-3">
          <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
          <p class="text-sm text-gray-600">{{ formattedLastUpdate }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TrendIndicator from "@/components/common/TrendIndicator.vue";
import type { GlacierStateInterface } from "@/services/glacierSimulation";
import { format, parseISO } from "date-fns";
import { computed, ref, watch } from "vue";

interface PropsInterface {
  glacierState: GlacierStateInterface;
}

const props = defineProps<PropsInterface>();

const previousVolume = ref<number | null>(null);
const previousMeltRate = ref<number | null>(null);
const previousOutflowRate = ref<number | null>(null);

watch(() => props.glacierState, (newState, oldState) => {
  if (oldState) {
    previousVolume.value = oldState.volume;
    previousMeltRate.value = oldState.meltRate;
    previousOutflowRate.value = oldState.outflowRate;
  }
}, { deep: true, immediate: true });

const formattedLastUpdate = computed(() => 
  format(parseISO(props.glacierState.lastUpdated.toISOString()), "dd MMM yyyy HH:mm:ss")
);
</script>
