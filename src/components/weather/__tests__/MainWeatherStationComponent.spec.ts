import { useMainWeatherStation } from '@/composables/weather/useMainWeatherStation';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@/types/weather/WeatherStationInterface';
import { mount } from '@vue/test-utils';
import { Observable } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
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
      averageTemperature: ref(20.5),
      totalPrecipitation: ref(5.2),
      lastUpdate: ref(new Date('2023-01-01T12:00:00'))
    };

    vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

    const wrapper = mount(MainWeatherStationComponent, {
      props: {
        id: '1',
        name: 'Test Station',
        subStationConfigs: []
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
    const averageTemperature = ref(20.5);
    const totalPrecipitation = ref(5.2);
    const lastUpdate = ref(new Date('2023-01-01T12:00:00'));

    const mockMainWeatherStation: MainWeatherStationInterface = {
      id: '1',
      name: 'Test Station',
      subStations: [],
      averageTemperature,
      totalPrecipitation,
      lastUpdate
    };

    vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

    const wrapper = mount(MainWeatherStationComponent, {
      props: {
        id: '1',
        name: 'Test Station',
        subStationConfigs: []
      }
    });

    expect(wrapper.text()).toContain('20.5');
    expect(wrapper.text()).toContain('5.20');

    averageTemperature.value = 22.0;
    totalPrecipitation.value = 6.5;
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('22.0');
    expect(wrapper.text()).toContain('6.50');
  });
});
