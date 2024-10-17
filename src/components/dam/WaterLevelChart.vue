<template>
  <div class="water-level-chart">
    <h3 className="font-semibold text-gray-700">Niveau d'eau: {{ formattedWaterLevel }} m</h3>
    <Bar :data="chartData" :options="chartOptions" ref="chartRef" />
  </div>
</template>

<script setup lang="ts">
import { useWaterLevelChart } from '@/composables/useWaterLevelChart';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { computed, ref, watch } from 'vue';
import { Bar } from 'vue-chartjs';
import { createChartOptions } from './waterLevelChartOptions';

// Enregistrement des composants nécessaires pour Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Interface définissant les props du composant
 */
interface PropsInterface {
  currentWaterLevel: number;
  maxWaterLevel: number;
  minWaterLevel: number;
}

// Définition des props avec des valeurs par défaut
const props = withDefaults(defineProps<PropsInterface>(), {
  maxWaterLevel: 100,
  minWaterLevel: 0
});

/**
 * Formatte le niveau d'eau actuel pour l'affichage
 */
const formattedWaterLevel = computed(() => props.currentWaterLevel.toFixed(2));

/**
 * Référence réactive pour le niveau d'eau actuel
 * Nécessaire car useWaterLevelChart attend une ref, pas une prop directement
 */
const currentWaterLevelRef = ref(props.currentWaterLevel);

// Utilisation du composable useWaterLevelChart
const { chartRef, chartData, updateChart } = useWaterLevelChart(currentWaterLevelRef);

/**
 * Options du graphique, créées à partir des props min et max
 */
const chartOptions = createChartOptions(props.maxWaterLevel, props.minWaterLevel);

/**
 * Observe les changements de la prop currentWaterLevel
 * Met à jour currentWaterLevelRef et le graphique en conséquence
 */
watch(() => props.currentWaterLevel, (newValue) => {
  currentWaterLevelRef.value = newValue;
  updateChart();
}, { immediate: true });
</script>

<style scoped>
.water-level-chart {
  height: 300px;
}
</style>
