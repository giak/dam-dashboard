import { useWaterSystem } from '@/composables/useWaterSystem';
import { mount } from '@vue/test-utils';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterSystemDashboard from '../WaterSystemDashboard.vue';

vi.mock('@/composables/useWaterSystem');
vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    template: '<div>Mocked Chart Component</div>'
  }
}));

describe('WaterSystemDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders correctly with initial data', async () => {
    const mockSystemState$ = new BehaviorSubject({
      id: '1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      maxWaterLevel: 100,
      minWaterLevel: 0,
      outflowRate: 25,
      inflowRate: 30,
      lastUpdated: new Date()
    });

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn()
    });

    const wrapper = mount(WaterSystemDashboard);

    await wrapper.vm.$nextTick();

    expect(wrapper.find('h1').text()).toBe("Tableau de bord du système d'eau");
    expect(wrapper.findComponent({ name: 'DamComponent' }).exists()).toBe(true);
  });

  it('calls initializeDam and cleanup on mount and unmount', async () => {
    const mockInitializeDam = vi.fn();
    const mockCleanup = vi.fn();

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: mockInitializeDam,
      systemState$: new BehaviorSubject(null),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: mockCleanup
    });

    const wrapper = mount(WaterSystemDashboard);

    await wrapper.vm.$nextTick();

    expect(mockInitializeDam).toHaveBeenCalledTimes(1);

    wrapper.unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});
