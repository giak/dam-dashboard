import type { Latitude, Longitude, WeatherDataInterface, WeatherStationConfig, WeatherStationInterface } from '@/types/weather/WeatherStationInterface';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateAverageTemperature, calculateTotalPrecipitation, createCombinedWeatherData$, useMainWeatherStation } from '../useMainWeatherStation';

// Mock des dépendances
vi.mock('../useWeatherStation', () => ({
  useWeatherStation: vi.fn()
}));

vi.mock('@/services/loggingService', () => ({
  loggingService: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Mock de onUnmounted
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn()
  };
});

// Importez useWeatherStation pour pouvoir l'utiliser avec vi.mocked
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
    it('should initialize main weather station with sub-stations', () => {
      const mockWeatherStation: WeatherStationInterface = {
        id: '1',
        name: 'Test Station',
        latitude: 45.5 as Latitude,
        longitude: -73.5 as Longitude,
        elevation: 100,
        weatherData$: of(mockWeatherData),
        cleanup: vi.fn()
      };
      vi.mocked(useWeatherStation).mockReturnValue(mockWeatherStation);

      const subStationConfigs: WeatherStationConfig[] = [
        { id: '1', name: 'Sub 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 },
        { id: '2', name: 'Sub 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200 }
      ];

      const mainStation = useMainWeatherStation('main', 'Main Station', subStationConfigs);

      expect(mainStation.id).toBe('main');
      expect(mainStation.name).toBe('Main Station');
      expect(mainStation.subStations).toHaveLength(2);
      expect(useWeatherStation).toHaveBeenCalledTimes(2);
    });

    it('should update average temperature and total precipitation', async () => {
      const mockWeatherStation1: WeatherStationInterface = {
        id: '1',
        name: 'Test Station 1',
        latitude: 45.5 as Latitude,
        longitude: -73.5 as Longitude,
        elevation: 100,
        weatherData$: new BehaviorSubject({ ...mockWeatherData, temperature: 20, precipitation: 5 }),
        cleanup: vi.fn()
      };
      const mockWeatherStation2: WeatherStationInterface = {
        id: '2',
        name: 'Test Station 2',
        latitude: 46.5 as Latitude,
        longitude: -74.5 as Longitude,
        elevation: 200,
        weatherData$: new BehaviorSubject({ ...mockWeatherData, temperature: 22, precipitation: 3 }),
        cleanup: vi.fn()
      };
      vi.mocked(useWeatherStation)
        .mockReturnValueOnce(mockWeatherStation1)
        .mockReturnValueOnce(mockWeatherStation2);

      const subStationConfigs: WeatherStationConfig[] = [
        { id: '1', name: 'Sub 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 },
        { id: '2', name: 'Sub 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200 }
      ];

      const mainStation = useMainWeatherStation('main', 'Main Station', subStationConfigs);

      // Wait for the next tick to ensure reactive updates have occurred
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mainStation.averageTemperature.value).toBe(21);
      expect(mainStation.totalPrecipitation.value).toBe(8);
    });
  });
});
