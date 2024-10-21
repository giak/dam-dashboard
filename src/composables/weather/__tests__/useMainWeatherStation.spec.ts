import type { Latitude, Longitude, WeatherDataInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { calculateAverageTemperature, calculateTotalPrecipitation, createCombinedWeatherData$, useMainWeatherStation } from '../useMainWeatherStation';

vi.mock('../useWeatherStation', () => ({
  useWeatherStation: vi.fn()
}));

vi.mock('@/services/loggingService', () => ({
  loggingService: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn()
  };
});

import { useWeatherStation } from '../useWeatherStation';

describe('useMainWeatherStation', () => {
  const mockWeatherData: WeatherDataInterface = {
    temperature: 20,
    precipitation: 5,
    windSpeed: 10,
    solarRadiation: 500,
    timestamp: new Date()
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('calculateAverageTemperature', () => {
    it('should calculate the average temperature correctly', () => {
      const data = [
        { ...mockWeatherData, temperature: 20 },
        { ...mockWeatherData, temperature: 22 },
        { ...mockWeatherData, temperature: 24 }
      ];
      expect(calculateAverageTemperature(data)).toBe(22);
    });
  });

  describe('calculateTotalPrecipitation', () => {
    it('should calculate the total precipitation correctly', () => {
      const data = [
        { ...mockWeatherData, precipitation: 5 },
        { ...mockWeatherData, precipitation: 3 },
        { ...mockWeatherData, precipitation: 2 }
      ];
      expect(calculateTotalPrecipitation(data)).toBe(10);
    });
  });

  describe('createCombinedWeatherData$', () => {
    it('should combine weather data from multiple stations', async () => {
      const station1$ = new BehaviorSubject({ ...mockWeatherData, temperature: 20 });
      const station2$ = new BehaviorSubject({ ...mockWeatherData, temperature: 22 });
      const mockStations: WeatherStationInterface[] = [
        { id: '1', name: 'Station 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100, weatherData$: station1$, cleanup: vi.fn() },
        { id: '2', name: 'Station 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200, weatherData$: station2$, cleanup: vi.fn() }
      ];

      const combined$ = createCombinedWeatherData$(mockStations);
      const result = await firstValueFrom(combined$);

      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(20);
      expect(result[1].temperature).toBe(22);
    });
  });

  describe('useMainWeatherStation', () => {
    it('should initialize correctly', () => {
      const mockWeatherStation: WeatherStationInterface = {
        id: '1',
        name: 'Sub 1',
        latitude: 45.5 as Latitude,
        longitude: -73.5 as Longitude,
        elevation: 100,
        weatherData$: new BehaviorSubject(mockWeatherData),
        cleanup: vi.fn()
      };

      vi.mocked(useWeatherStation).mockReturnValue(mockWeatherStation);

      const { 
        id, 
        name, 
        subStations, 
        averageTemperature, 
        totalPrecipitation, 
        lastUpdate,
        temperature$,
        precipitation$
      } = useMainWeatherStation('1', 'Main Station', [{ id: '1', name: 'Sub 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 }]);

      expect(id).toBe('1');
      expect(name).toBe('Main Station');
      expect(subStations).toHaveLength(1);
      expect(averageTemperature.value).toBe(20);
      expect(totalPrecipitation.value).toBe(5);
      expect(lastUpdate.value).toBeInstanceOf(Date);
      expect(temperature$).toBeDefined();
      expect(precipitation$).toBeDefined();
    });

    it('should update weather data when sub-stations update', async () => {
      const mockWeatherStation1: WeatherStationInterface = {
        id: '1',
        name: 'Sub 1',
        latitude: 45.5 as Latitude,
        longitude: -73.5 as Longitude,
        elevation: 100,
        weatherData$: new BehaviorSubject({ ...mockWeatherData, temperature: 20, precipitation: 5 }),
        cleanup: vi.fn()
      };

      const mockWeatherStation2: WeatherStationInterface = {
        id: '2',
        name: 'Sub 2',
        latitude: 46.5 as Latitude,
        longitude: -74.5 as Longitude,
        elevation: 200,
        weatherData$: new BehaviorSubject({ ...mockWeatherData, temperature: 30, precipitation: 10 }),
        cleanup: vi.fn()
      };

      vi.mocked(useWeatherStation)
        .mockReturnValueOnce(mockWeatherStation1)
        .mockReturnValueOnce(mockWeatherStation2);

      const { 
        averageTemperature, 
        totalPrecipitation,
        temperature$,
        precipitation$
      } = useMainWeatherStation('1', 'Main Station', [
        { id: '1', name: 'Sub 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 },
        { id: '2', name: 'Sub 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200 }
      ]);

      expect(averageTemperature.value).toBe(25);
      expect(totalPrecipitation.value).toBe(15);

      let temperatureValue: number | undefined;
      let precipitationValue: number | undefined;

      temperature$.subscribe(value => temperatureValue = value);
      precipitation$.subscribe(value => precipitationValue = value);

      expect(temperatureValue).toBe(25);
      expect(precipitationValue).toBe(15);

      // Simulate weather change
      (mockWeatherStation1.weatherData$ as BehaviorSubject<WeatherDataInterface>).next({ ...mockWeatherData, temperature: 25, precipitation: 8 });
      (mockWeatherStation2.weatherData$ as BehaviorSubject<WeatherDataInterface>).next({ ...mockWeatherData, temperature: 35, precipitation: 12 });

      // Wait for the next tick to ensure reactive updates have occurred
      await nextTick();

      expect(averageTemperature.value).toBe(30);
      expect(totalPrecipitation.value).toBe(20);
      expect(temperatureValue).toBe(30);
      expect(precipitationValue).toBe(20);
    });
  });
});
