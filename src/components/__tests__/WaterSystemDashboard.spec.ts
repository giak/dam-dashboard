import { useWaterSystem } from '@composables/useWaterSystem';
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

  it('updates dam state when systemState$ emits new value', async () => {
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

    mockSystemState$.next({
      ...mockSystemState$.getValue(),
      currentWaterLevel: 75
    });

    await wrapper.vm.$nextTick();

    const damComponent = wrapper.findComponent({ name: 'DamComponent' });
    expect(damComponent.props('damState').currentWaterLevel).toBe(75);
  });

  it('handles error in systemState$ subscription', async () => {
    vi.useFakeTimers();
    const mockSystemState$ = new BehaviorSubject(null);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn()
    });

    mount(WaterSystemDashboard);

    await vi.runAllTimersAsync();

    mockSystemState$.error(new Error('Test error'));

    expect(consoleSpy).toHaveBeenCalledWith('Erreur dans la souscription systemState$:', expect.any(Error));

    consoleSpy.mockRestore();
    vi.useRealTimers();
  });
});
