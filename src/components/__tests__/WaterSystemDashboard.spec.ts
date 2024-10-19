import { useWaterSystem } from '@composables/useWaterSystem';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import type { RiverStateInterface } from '@services/riverSimulation';
import type { MainWeatherStationInterface, WeatherStationConfig } from '@/types/weather/WeatherStationInterface';
import { mount } from '@vue/test-utils';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterSystemDashboard from '../WaterSystemDashboard.vue';
import { ref } from 'vue';

// Mock des dépendances
vi.mock('@/composables/useWaterSystem', () => ({
  useWaterSystem: vi.fn(),
}));
vi.mock('@services/loggingService');
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
    const mockSystemState$ = new BehaviorSubject<{
      dam: DamInterface | null;
      glacier: GlacierStateInterface | null;
      river: RiverStateInterface | null;
      mainWeather: MainWeatherStationInterface | null;
    }>({
      dam: {
        id: '1',
        name: 'Test Dam',
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0,
        outflowRate: 25,
        inflowRate: 30,
        lastUpdated: new Date(),
        maxCapacity: 100,
      },
      glacier: {
        id: '1',
        name: 'Test Glacier',
        meltRate: 0.5,
        volume: 1000000,
        outflowRate: 0.5,
        lastUpdated: new Date(),
      },
      river: {
        id: '1',
        name: 'Test River',
        flowRate: 20,
        waterVolume: 500000,
        lastUpdated: new Date(),
      },
      mainWeather: {
        id: '1',
        name: 'Test Weather Station',
        subStations: [],
        averageTemperature: ref(20),
        totalPrecipitation: ref(5),
        lastUpdate: ref(new Date()),
      },
    });

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      initializeMainWeatherStation: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>(),
    });

    const wrapper = mount(WaterSystemDashboard);

    await wrapper.vm.$nextTick();

    expect(wrapper.find('h1').text()).toBe("Tableau de bord du système d'eau");
    expect(wrapper.findComponent({ name: 'DamComponent' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'GlacierComponent' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'RiverComponent' }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'MainWeatherStationComponent' }).exists()).toBe(true);
  });

  it('calls initializeDam, initializeGlacier, initializeRiver, initializeMainWeatherStation, and cleanup on mount and unmount', async () => {
    const mockInitializeDam = vi.fn();
    const mockInitializeGlacier = vi.fn();
    const mockInitializeRiver = vi.fn();
    const mockInitializeMainWeatherStation = vi.fn();
    const mockCleanup = vi.fn();

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: mockInitializeDam,
      initializeGlacier: mockInitializeGlacier,
      initializeRiver: mockInitializeRiver,
      initializeMainWeatherStation: mockInitializeMainWeatherStation,
      systemState$: new BehaviorSubject({ dam: null, glacier: null, river: null, mainWeather: null }),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: mockCleanup,
      error$: new Subject<string | null>(),
    });

    const wrapper = mount(WaterSystemDashboard);

    await wrapper.vm.$nextTick();

    expect(mockInitializeDam).toHaveBeenCalledTimes(1);
    expect(mockInitializeGlacier).toHaveBeenCalledTimes(1);
    expect(mockInitializeRiver).toHaveBeenCalledTimes(1);
    expect(mockInitializeMainWeatherStation).toHaveBeenCalledTimes(1);
    expect(loggingService.info).toHaveBeenCalledWith('Initialisation du tableau de bord du système d\'eau', 'WaterSystemDashboard');

    wrapper.unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
    expect(loggingService.info).toHaveBeenCalledWith('Nettoyage du tableau de bord du système d\'eau', 'WaterSystemDashboard');
  });

  it('updates dam, glacier, river and weather state when systemState$ emits new value', async () => {
    const mockSystemState$ = new BehaviorSubject({
      dam: {
        currentWaterLevel: 50,
        outflowRate: 25,
        inflowRate: 30,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as DamInterface,
      glacier: {
        meltRate: 0.5,
        volume: 1000000,
        outflowRate: 0.5,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as GlacierStateInterface,
      river: {
        flowRate: 20,
        waterVolume: 500000,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as RiverStateInterface,
      mainWeather: {
        id: 'weather1',
        name: 'Main Weather Station',
        subStations: [],
        averageTemperature: ref(20),
        totalPrecipitation: ref(5),
        lastUpdate: ref(new Date())
      } as MainWeatherStationInterface,
    });

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      initializeMainWeatherStation: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>(),
    });

    const wrapper = mount(WaterSystemDashboard);

    await wrapper.vm.$nextTick();

    mockSystemState$.next({
      dam: {
        currentWaterLevel: 75,
        outflowRate: 30,
        inflowRate: 35,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as DamInterface,
      glacier: {
        meltRate: 0.7,
        volume: 950000,
        outflowRate: 0.6,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as GlacierStateInterface,
      river: {
        flowRate: 25,
        waterVolume: 550000,
        lastUpdated: new Date(),
        // Ajoutez d'autres propriétés nécessaires ici
      } as RiverStateInterface,
      mainWeather: {
        id: 'weather1',
        name: 'Main Weather Station',
        subStations: [],
        averageTemperature: ref(22),
        totalPrecipitation: ref(6),
        lastUpdate: ref(new Date())
      } as MainWeatherStationInterface,
    });

    await wrapper.vm.$nextTick();

    expect(loggingService.info).toHaveBeenCalledWith('État du système mis à jour', 'WaterSystemDashboard', expect.any(Object));
  });

  it('handles error in systemState$ subscription', async () => {
    vi.useFakeTimers();
    const mockSystemState$ = new Subject();
    const mockError$ = new Subject<string | null>();

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      initializeMainWeatherStation: vi.fn(),
      systemState$: mockSystemState$ as Observable<any>,
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$,
    });

    mount(WaterSystemDashboard);

    await vi.runAllTimersAsync();

    mockSystemState$.error(new Error('Test error'));

    expect(loggingService.error).toHaveBeenCalledWith(
      'Erreur dans la souscription systemState$',
      'WaterSystemDashboard',
      expect.objectContaining({ error: expect.any(Error) })
    );

    vi.useRealTimers();
  });

  it('handles error$ emissions', async () => {
    vi.useFakeTimers();
    const mockError$ = new Subject<string | null>();

    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      initializeMainWeatherStation: vi.fn(),
      systemState$: new BehaviorSubject({ dam: null, glacier: null, river: null, mainWeather: null }),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$,
    });

    mount(WaterSystemDashboard);

    await vi.runAllTimersAsync();

    mockError$.next('Test error');

    expect(loggingService.error).toHaveBeenCalledWith(
      'Erreur du système d\'eau',
      'WaterSystemDashboard',
      expect.objectContaining({ error: 'Test error' })
    );

    vi.useRealTimers();
  });
});
