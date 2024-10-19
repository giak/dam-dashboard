<template>
  <div class="main-weather-station bg-white shadow-sm border border-gray-200 p-4 max-w-sm" role="region" aria-label="Station météo principale">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <WeatherDataDisplay
        label="Température moyenne"
        :value="averageTemperature"
        unit="°C"
        color="blue"
        :precision="1"
      />
      <WeatherDataDisplay
        label="Précipitations totales"
        :value="totalPrecipitation"
        unit="mm"
        color="green"
        :precision="2"
      />
      <div class="border-l-2 border-purple-500 pl-3">
        <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
        <p class="text-sm text-gray-600">{{ formattedLastUpdate }}</p>
      </div>
    </div>
    <div class="mt-4">
      <h3 class="text-lg font-semibold mb-2">Sous-stations</h3>
      <ul class="space-y-2">
        <li v-for="station in subStations" :key="station.id" class="text-sm">
          {{ station.name }} ({{ station.latitude.toFixed(2) }}, {{ station.longitude.toFixed(2) }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMainWeatherStation } from '@/composables/weather/useMainWeatherStation';
import type { WeatherStationInterface } from '@/types/weather/WeatherStationInterface';
import { format, parseISO } from "date-fns";
import { computed } from 'vue';
import WeatherDataDisplay from './WeatherDataDisplay.vue';

interface PropsInterface {
  id: string;
  name: string;
  subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>;
}

const props = defineProps<PropsInterface>();

const {
  id,
  name,
  subStations,
  averageTemperature,
  totalPrecipitation,
  lastUpdate
} = useMainWeatherStation(props.id, props.name, props.subStationConfigs);

const formattedLastUpdate = computed(() => 
  format(parseISO(lastUpdate.value.toISOString()), "dd MMM yyyy HH:mm:ss")
);
</script>
