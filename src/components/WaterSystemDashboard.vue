<template>
  <div class="water-system-dashboard">
    <h1 class="text-3xl font-bold mb-6">Tableau de bord du système d'eau</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DamComponent v-if="damState" :damState="damState" />
      <GlacierComponent 
        v-if="glacierState" 
        :glacierState="glacierState" 
        :currentTemperature="mainWeatherState?.averageTemperature.value || 0"
      />
      <RiverComponent 
        v-if="riverState" 
        :riverState="riverState" 
        :currentPrecipitation="mainWeatherState?.totalPrecipitation.value || 0"
      />
      <MainWeatherStationComponent
        v-if="mainWeatherState"
        :mainWeatherState="mainWeatherState"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DamComponent from '@components/dam/DamComponent.vue';
import GlacierComponent from '@components/glacier/GlacierComponent.vue';
import RiverComponent from '@components/river/RiverComponent.vue';
import MainWeatherStationComponent from '@components/weather/MainWeatherStationComponent.vue';
import { useWaterSystem } from '@composables/useWaterSystem';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { Latitude, Longitude, MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { Subscription } from 'rxjs';
import { onMounted, onUnmounted, ref } from 'vue';

const damState = ref<DamInterface | null>(null);
const glacierState = ref<GlacierStateInterface | null>(null);
const riverState = ref<RiverStateInterface | null>(null);
const mainWeatherState = ref<MainWeatherStationInterface | null>(null);

const {
  initializeDam,
  initializeGlacier,
  initializeRiver,
  initializeMainWeatherStation,
  systemState$,
  cleanup,
  error$
} = useWaterSystem();

let systemStateSubscription: Subscription | null = null;
let errorSubscription: Subscription | null = null;

onMounted(() => {
  // Initialize the main weather station
  initializeMainWeatherStation('main-station', 'Station Météo Principale', [
    { id: 'sub1', name: 'Sous-station 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 },
    { id: 'sub2', name: 'Sous-station 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200 }
  ]);

  // Initialize the dam, glacier, and river
  initializeDam({
    id: 'dam1',
    name: 'Barrage Principal',
    currentWaterLevel: 50,
    maxWaterLevel: 100,
    minWaterLevel: 0,
    outflowRate: 10,
    inflowRate: 12,
    lastUpdated: new Date(),
    maxCapacity: 1000000
  });

  initializeGlacier({
    id: 'glacier1',
    name: 'Glacier Principal',
    volume: 1000000,
    meltRate: 0.1,
    outflowRate: 5,
    lastUpdated: new Date(),
    elevation: 3000,
    area: 50000,
    temperature: -5,
    flow: 10
  });

  initializeRiver({
    id: 'river1',
    name: 'Rivière Principale',
    flowRate: 20,
    waterVolume: 500000,
    lastUpdated: new Date(),
    waterLevel: 5,
    temperature: 15,
    pollutionLevel: 0.1,
    catchmentArea: 100000
  });

  // Subscribe to system state updates
  systemStateSubscription = systemState$.subscribe({
    next: (state) => {
      damState.value = state.dam;
      glacierState.value = state.glacier;
      riverState.value = state.river;
      mainWeatherState.value = state.mainWeather;
    },
    error: (err) => {
      console.error('Error in systemState$ subscription', err);
    }
  });

  // Subscribe to errors
  errorSubscription = error$.subscribe((error) => {
    if (error) {
      console.error('Water system error', error);
    }
  });
});

onUnmounted(() => {
  if (systemStateSubscription) {
    systemStateSubscription.unsubscribe();
  }
  if (errorSubscription) {
    errorSubscription.unsubscribe();
  }
  cleanup();
});
</script>
