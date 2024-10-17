import { useWaterLevelChart } from '@/composables/useWaterLevelChart';
import { mount } from '@vue/test-utils';
import type { ChartData } from 'chart.js';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import WaterLevelChart from '../dam/WaterLevelChart.vue';
import { createChartOptions } from '../dam/waterLevelChartOptions';

vi.mock('@/composables/useWaterLevelChart', () => ({
  useWaterLevelChart: vi.fn()
}));

vi.mock('../dam/waterLevelChartOptions', () => ({
  createChartOptions: vi.fn(() => ({}))
}));

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    template: '<div>Mocked Chart Component</div>'
  }
}));

describe('WaterLevelChart', () => {
  it('renders correctly', () => {
    const mockChartRef = ref({ chart: null });
    const mockChartData = ref<ChartData<'bar'>>({
      labels: [],
      datasets: []
    });
    const mockUpdateChart = vi.fn();
    const mockInitChart = vi.fn();

    vi.mocked(useWaterLevelChart).mockReturnValue({
      chartRef: mockChartRef,
      chartData: mockChartData,
      updateChart: mockUpdateChart,
      initChart: mockInitChart
    });

    const wrapper = mount(WaterLevelChart, {
      props: {
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0
      }
    });

    expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(true);
    expect(createChartOptions).toHaveBeenCalledWith(100, 0);
  });

  it('updates when currentWaterLevel changes', async () => {
    const mockChartRef = ref({ chart: null });
    const mockChartData = ref<ChartData<'bar'>>({
      labels: [],
      datasets: []
    });
    const mockUpdateChart = vi.fn();
    const mockInitChart = vi.fn();

    vi.mocked(useWaterLevelChart).mockReturnValue({
      chartRef: mockChartRef,
      chartData: mockChartData,
      updateChart: mockUpdateChart,
      initChart: mockInitChart
    });

    const wrapper = mount(WaterLevelChart, {
      props: {
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0
      }
    });

    await wrapper.setProps({ currentWaterLevel: 75 });

    expect(mockUpdateChart).toHaveBeenCalled();
  });
});
