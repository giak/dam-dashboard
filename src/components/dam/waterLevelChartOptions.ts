import type { ChartOptions } from 'chart.js';

/**
 * Crée les options du graphique de niveau d'eau.
 * @param maxWaterLevel - Niveau d'eau maximum
 * @param minWaterLevel - Niveau d'eau minimum
 * @returns Les options du graphique
 */
export function createChartOptions(maxWaterLevel: number, minWaterLevel: number): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxWaterLevel,
        suggestedMin: minWaterLevel,
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
        enabled: true,
        callbacks: {
          label: (context) => `Niveau d'eau: ${context.parsed.y.toFixed(2)} m`
        }
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
}
