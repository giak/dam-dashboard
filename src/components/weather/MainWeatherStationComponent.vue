<template>
  <div class="main-weather-station bg-white shadow-sm border border-gray-200 p-4 max-w-sm">
    <h2 class="text-2xl font-semibold mb-4 text-gray-800 border-b pb-1">{{ mainWeatherState.name }}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
      <div class="border-l-2 border-blue-500 pl-3">
        <p class="text-sm font-medium text-gray-500 mb-1">Température moyenne</p>
        <p class="text-xl font-bold text-blue-600">{{ averageTemperatureValue.toFixed(1) }}°C</p>
      </div>
      <div class="border-l-2 border-green-500 pl-3">
        <p class="text-sm font-medium text-gray-500 mb-1">Précipitations totales</p>
        <p class="text-xl font-bold text-green-600">{{ totalPrecipitationValue.toFixed(2) }} mm</p>
      </div>
      <div class="border-l-2 border-purple-500 pl-3">
        <p class="text-sm font-medium text-gray-500 mb-1">Dernière mise à jour</p>
        <p class="text-sm text-gray-600">{{ formattedLastUpdate }}</p>
      </div>
    </div>
    <div class="mt-4">
      <h3 class="text-lg font-semibold mb-2">Sous-stations</h3>
      <ul class="space-y-2">
        <li v-for="station in mainWeatherState.subStations" :key="station.id" class="text-sm">
          {{ station.name }} ({{ station.latitude.toFixed(2) }}, {{ station.longitude.toFixed(2) }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { format } from 'date-fns';
import { computed } from 'vue';

interface PropsInterface {
  mainWeatherState: MainWeatherStationInterface;
}

const props = defineProps<PropsInterface>();

const formattedLastUpdate = computed(() => {
  const date = props.mainWeatherState.lastUpdate;
  return date instanceof Date ? format(date, "dd MMM yyyy HH:mm:ss") : 'N/A';
});

const averageTemperatureValue = computed(() => {
  const temp = props.mainWeatherState.averageTemperature;
  return typeof temp === 'number' ? temp : temp.value;
});

const totalPrecipitationValue = computed(() => {
  const precip = props.mainWeatherState.totalPrecipitation;
  return typeof precip === 'number' ? precip : precip.value;
});
</script>
