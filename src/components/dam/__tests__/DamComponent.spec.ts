import TrendIndicator from '@/components/common/TrendIndicator.vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DamComponent from '../DamComponent.vue';
import WaterLevelChart from '../WaterLevelChart.vue';

// Mock des dépendances
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Mocked Date'),
  parseISO: vi.fn((date) => new Date(date)),
}));

vi.mock('../WaterLevelChart.vue', () => ({
  default: {
    name: 'WaterLevelChart',
    render: () => null,
  },
}));

describe('DamComponent', () => {
  const mockDamState = {
    id: '1',
    name: 'Test Dam',
    currentWaterLevel: 50,
    maxWaterLevel: 100,
    minWaterLevel: 0,
    maxCapacity: 1000000, // Ajout de la propriété maxCapacity
    outflowRate: 10,
    inflowRate: 15,
    lastUpdated: new Date('2023-01-01T00:00:00Z'),
  };

  it('renders correctly with initial props', () => {
    const wrapper = mount(DamComponent, {
      props: { damState: mockDamState },
      global: {
        stubs: {
          TrendIndicator: true,
          WaterLevelChart: true,
        },
      },
    });

    expect(wrapper.find('h2').text()).toBe('Test Dam');
    expect(wrapper.find('.text-blue-600').text()).toContain('50.0000 m');
    expect(wrapper.find('.text-gray-600').text()).toContain('10.00 m³/s');
    expect(wrapper.findAll('.text-gray-600')[1].text()).toContain('15.00 m³/s');
    expect(wrapper.findComponent(WaterLevelChart).exists()).toBe(true);
  });

  it('updates trend indicators when dam state changes', async () => {
    const wrapper = mount(DamComponent, {
      props: { damState: mockDamState },
      global: {
        stubs: {
          WaterLevelChart: true,
        },
      },
    });

    // Initial state should be stable
    let waterLevelTrend = wrapper.findAllComponents(TrendIndicator)[0];
    expect(waterLevelTrend.props('currentValue')).toBe(50);
    expect(waterLevelTrend.props('previousValue')).toBe(null);

    // Update dam state
    await wrapper.setProps({
      damState: {
        ...mockDamState,
        currentWaterLevel: 55,
        outflowRate: 12,
        inflowRate: 14,
      },
    });

    // Force a re-render and wait for the next tick
    await wrapper.vm.$nextTick();

    // Check updated trends
    waterLevelTrend = wrapper.findAllComponents(TrendIndicator)[0];
    const outflowTrend = wrapper.findAllComponents(TrendIndicator)[1];
    const inflowTrend = wrapper.findAllComponents(TrendIndicator)[2];

    expect(waterLevelTrend.props('currentValue')).toBe(55);
    expect(waterLevelTrend.props('previousValue')).toBe(50);
    expect(waterLevelTrend.props('upColor')).toBe('text-red-500');
    expect(waterLevelTrend.props('downColor')).toBe('text-green-500');

    expect(outflowTrend.props('currentValue')).toBe(12);
    expect(outflowTrend.props('previousValue')).toBe(10);

    expect(inflowTrend.props('currentValue')).toBe(14);
    expect(inflowTrend.props('previousValue')).toBe(15);
  });
});
