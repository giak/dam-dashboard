import { withErrorHandling } from '@utils/errorHandlerUtil';
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
  /** Fonction pour initialiser le graphique */
  initChart: (chart: ChartJS) => void;
}

/**
 * Composable pour gérer un graphique de niveau d'eau.
 * 
 * Ce composable fournit les fonctionnalités nécessaires pour créer et gérer
 * un graphique de niveau d'eau en utilisant Chart.js. Il gère la réactivité
 * des données et fournit des méthodes pour initialiser et mettre à jour le graphique.
 * 
 * @param currentWaterLevel - Référence réactive au niveau d'eau actuel
 * @returns Un objet contenant les références et fonctions nécessaires pour le graphique
 * 
 * @example
 * // Dans un composant Vue
 * import { ref } from 'vue';
 * import { useWaterLevelChart } from '@/composables/useWaterLevelChart';
 * import { Chart } from 'chart.js/auto';
 * 
 * export default {
 *   setup() {
 *     const waterLevel = ref(50);
 *     const { chartRef, chartData, updateChart, initChart } = useWaterLevelChart(waterLevel);
 * 
 *     // Initialisation du graphique (à faire dans onMounted)
 *     const initializeChart = () => {
 *       const ctx = document.getElementById('myChart') as HTMLCanvasElement;
 *       const newChart = new Chart(ctx, {
 *         type: 'bar',
 *         data: chartData.value,
 *         options: {
 *           responsive: true,
 *           scales: { y: { beginAtZero: true } }
 *         }
 *       });
 *       initChart(newChart);
 *     };
 * 
 *     // Exemple de mise à jour du niveau d'eau
 *     const updateWaterLevel = (newLevel: number) => {
 *       waterLevel.value = newLevel;
 *       // updateChart est appelé automatiquement grâce au watcher dans le composable
 *     };
 * 
 *     return { chartRef, updateWaterLevel, initializeChart };
 *   }
 * }
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
   * 
   * @example
   * // Mise à jour manuelle du graphique
   * const { updateChart } = useWaterLevelChart(waterLevel);
   * updateChart();
   */
  const updateChart = withErrorHandling(() => {
    if (chartRef.value?.chart) {
      chartRef.value.chart.data = chartData.value;
      chartRef.value.chart.update();
    }
  }, 'useWaterLevelChart.updateChart');

  /**
   * Initialise le graphique avec la chart fournie.
   * Cette fonction doit être appelée une fois que l'instance Chart.js a été créée.
   * 
   * @param chart - L'instance Chart.js à utiliser
   * 
   * @example
   * // Initialisation du graphique
   * const { initChart } = useWaterLevelChart(waterLevel);
   * const chart = new Chart(ctx, config);
   * initChart(chart);
   */
  const initChart = withErrorHandling((chart: ChartJS) => {
    chartRef.value.chart = chart;
    updateChart();
  }, 'useWaterLevelChart.initChart');

  // Observe les changements de currentWaterLevel et met à jour le graphique en conséquence
  watch(currentWaterLevel, () => {
    if (chartRef.value?.chart) {
      updateChart();
    }
  });

  return {
    chartRef,
    chartData,
    updateChart,
    initChart
  };
}
