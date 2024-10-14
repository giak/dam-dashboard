<template>
  <div class="water-level-chart">
    <h3>Niveau d'eau: {{ currentWaterLevel.toFixed(2) }} m</h3>
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { computed, ref, watch } from 'vue';
import { Bar } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  currentWaterLevel: number;
}>();

const chartData = ref({
  labels: [''],
  datasets: [
    {
      label: 'Niveau d\'eau (m)',
      data: [props.currentWaterLevel],
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1,
      barPercentage: 1.0,
      categoryPercentage: 1.0
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      suggestedMax: 100,
      title: {
        display: true,
        text: 'Niveau (m)'
      }
    },
    x: {
      display: false,
      grid: {
        display: false
      }
    }
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: false
    }
  },
  animation: {
    duration: 0
  },
  layout: {
    padding: {
      left: 10,
      right: 10
    }
  }
};

const updateChartData = computed(() => {
  chartData.value.datasets[0].data = [props.currentWaterLevel];
  return chartData.value;
});

watch(() => props.currentWaterLevel, () => {
  updateChartData.value;
});
</script>

<style scoped>
.water-level-chart {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  height: 300px;
}
</style>
