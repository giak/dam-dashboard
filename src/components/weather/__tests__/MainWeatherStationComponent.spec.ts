import { useMainWeatherStation } from '@/composables/weather/useMainWeatherStation';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { mount } from '@vue/test-utils';
import { Observable, BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import MainWeatherStationComponent from '../MainWeatherStationComponent.vue';

// Mock the useMainWeatherStation composable
vi.mock('@/composables/weather/useMainWeatherStation', () => ({
  useMainWeatherStation: vi.fn()
}));

describe('MainWeatherStationComponent', () => {
  it('renders properly', () => {
    const mockSubStation: WeatherStationInterface = {
      id: '1',
      name: 'Sub 1',
      latitude: 45.5 as any, // Type assertion as Latitude
      longitude: -73.5 as any, // Type assertion as Longitude
      elevation: 100,
      weatherData$: new Observable(),
      cleanup: vi.fn()
    };

    const mockMainWeatherStation: MainWeatherStationInterface = {
      id: '1',
      name: 'Test Station',
      subStations: [mockSubStation, { ...mockSubStation, id: '2', name: 'Sub 2' }],
      averageTemperature: computed(() => 20.5),
      totalPrecipitation: computed(() => 5.2),
      lastUpdate: computed(() => new Date('2023-01-01T12:00:00')),
      temperature$: new BehaviorSubject(20.5),
      precipitation$: new BehaviorSubject(5.2)
    };

    vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

    const wrapper = mount(MainWeatherStationComponent, {
      props: {
        mainWeatherState: mockMainWeatherStation
      }
    });

    expect(wrapper.text()).toContain('Test Station');
    expect(wrapper.text()).toContain('Température moyenne');
    expect(wrapper.text()).toContain('20.5');
    expect(wrapper.text()).toContain('Précipitations totales');
    expect(wrapper.text()).toContain('5.20');
    expect(wrapper.text()).toContain('Sub 1');
    expect(wrapper.text()).toContain('Sub 2');
  });

  it('updates when data changes', async () => {
    const averageTemperature = computed(() => 20.5);
    const totalPrecipitation = computed(() => 5.2);
    const lastUpdate = computed(() => new Date('2023-01-01T12:00:00'));
    const temperature$ = new BehaviorSubject(20.5);
    const precipitation$ = new BehaviorSubject(5.2);

    const mockMainWeatherStation: MainWeatherStationInterface = {
      id: '1',
      name: 'Test Station',
      subStations: [],
      averageTemperature,
      totalPrecipitation,
      lastUpdate,
      temperature$,
      precipitation$
    };

    vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

    const wrapper = mount(MainWeatherStationComponent, {
      props: {
        mainWeatherState: mockMainWeatherStation
      }
    });

    expect(wrapper.text()).toContain('20.5');
    expect(wrapper.text()).toContain('5.20');

    temperature$.next(22.0);
    precipitation$.next(6.5);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('22.0');
    expect(wrapper.text()).toContain('6.50');
  });
});
