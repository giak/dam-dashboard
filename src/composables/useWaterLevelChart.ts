import type { ChartData, Chart as ChartJS } from 'chart.js';
import { computed, ref, watch, type Ref } from 'vue';

/**
 * Interface définissant la structure de retour de la fonction useWaterLevelChart.
 */
interface WaterLevelChartReturnInterface {
  /** Référence à l'instance du graphique Chart.js */
  chartRef: Ref<{ chart: ChartJS | null }>;
  /** Données du graphique, calculées de manière réactive */
  chartData: Ref<ChartData<'bar'>>;
  /** Fonction pour mettre à jour manuellement le graphique */
  updateChart: () => void;
}

/**
 * Composable pour gérer un graphique de niveau d'eau.
 * 
 * @param currentWaterLevel - Référence réactive au niveau d'eau actuel
 * @returns Un objet contenant les références et fonctions nécessaires pour le graphique
 */
export function useWaterLevelChart(currentWaterLevel: Ref<number>): WaterLevelChartReturnInterface {
  // Référence à l'instance du graphique Chart.js
  const chartRef = ref<{ chart: ChartJS | null }>({ chart: null });

  /**
   * Calcule les données du graphique de manière réactive.
   * Se met à jour automatiquement lorsque currentWaterLevel change.
   */
  const chartData = computed<ChartData<'bar'>>(() => ({
    labels: ['Niveau d\'eau'],
    datasets: [
      {
        label: 'Niveau d\'eau (m)',
        data: [currentWaterLevel.value],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0
      }
    ]
  }));

  /**
   * Met à jour manuellement le graphique.
   * Utile lorsque les données changent mais que le graphique ne se met pas à jour automatiquement.
   */
  const updateChart = () => {
    if (chartRef.value?.chart) {
      chartRef.value.chart.update();
    }
  };

  // Observe les changements de currentWaterLevel et met à jour le graphique en conséquence
  watch(currentWaterLevel, updateChart, { immediate: true });

  return {
    chartRef,
    chartData,
    updateChart
  };
}
