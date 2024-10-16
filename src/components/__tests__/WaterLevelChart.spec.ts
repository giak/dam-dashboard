import { useWaterLevelChart } from '@/composables/useWaterLevelChart';
import { mount } from '@vue/test-utils';
import type { ChartData } from 'chart.js';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import WaterLevelChart from '../dam/WaterLevelChart.vue';

vi.mock('@/composables/useWaterLevelChart', () => ({
  useWaterLevelChart: vi.fn(() => ({
    chartRef: ref({ chart: null }),
    chartData: ref<ChartData<'bar'>>({
      labels: [],
      datasets: []
    }),
    updateChart: vi.fn()
  }))
}));

vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',  
    template: '<div>Mocked Chart Component</div>'
  }
}));
  
describe('WaterLevelChart', () => {
  it('renders correctly', () => {
    const wrapper = mount(WaterLevelChart, {
      props: {
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0
      }
    });

    expect(wrapper.find('h3').text()).toBe('Niveau d\'eau: 50.00 m');
    expect(wrapper.findComponent({ name: 'Bar' }).exists()).toBe(true);
  });

  it('updates when currentWaterLevel changes', async () => {
    const mockUpdateChart = vi.fn();
    vi.mocked(useWaterLevelChart).mockReturnValue({
      chartRef: ref({ chart: null }),
      chartData: ref<ChartData<'bar'>>({
        labels: [],
        datasets: []
      }),
      updateChart: mockUpdateChart
    });

    const wrapper = mount(WaterLevelChart, {
      props: {
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0
      }
    });

    await wrapper.setProps({ currentWaterLevel: 75 });

    expect(wrapper.find('h3').text()).toBe('Niveau d\'eau: 75.00 m');
    expect(mockUpdateChart).toHaveBeenCalled();
  });
});
