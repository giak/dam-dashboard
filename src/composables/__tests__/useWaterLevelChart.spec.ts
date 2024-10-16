import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useWaterLevelChart } from '../useWaterLevelChart';

describe('useWaterLevelChart', () => {
  it('should initialize with correct data', () => {
    const currentWaterLevel = ref(50);
    const { chartData, chartRef, updateChart } = useWaterLevelChart(currentWaterLevel);

    expect(chartRef.value).toEqual({ chart: null });
    expect(chartData.value).toEqual({
      labels: ['Niveau d\'eau'],
      datasets: [
        {
          label: 'Niveau d\'eau (m)',
          data: [50],
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
          barPercentage: 1.0,
          categoryPercentage: 1.0
        }
      ]
    });
    expect(typeof updateChart).toBe('function');
  });

  it('should update chartData when currentWaterLevel changes', async () => {
    const currentWaterLevel = ref(50);
    const { chartData } = useWaterLevelChart(currentWaterLevel);

    expect(chartData.value.datasets[0].data[0]).toBe(50);

    currentWaterLevel.value = 75;
    await Promise.resolve(); // Wait for the next tick

    expect(chartData.value.datasets[0].data[0]).toBe(75);
  });

  it('should call chart.update when updateChart is called', () => {
    const currentWaterLevel = ref(50);
    const { chartRef, updateChart } = useWaterLevelChart(currentWaterLevel);

    const mockUpdate = vi.fn();
    chartRef.value = { chart: { update: mockUpdate } as any };

    updateChart();

    expect(mockUpdate).toHaveBeenCalled();
  });
});
