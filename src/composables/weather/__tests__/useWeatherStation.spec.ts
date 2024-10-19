import { createWeatherSimulation } from '@/services/weatherSimulation';
import { isValidLatitude, isValidLongitude, type Latitude, type Longitude, type WeatherStationConfig } from '@/types/weather/WeatherStationInterface';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeatherStation } from '../useWeatherStation';

vi.mock('@/services/weatherSimulation');
vi.mock('@/types/weather/WeatherStationInterface', () => ({
  isValidLatitude: vi.fn(),
  isValidLongitude: vi.fn(),
}));

describe('useWeatherStation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(isValidLatitude).mockReturnValue(true);
    vi.mocked(isValidLongitude).mockReturnValue(true);
    vi.mocked(createWeatherSimulation).mockReturnValue({
      weatherData$: {} as any,
      startSimulation: vi.fn(),
      stopSimulation: vi.fn(),
      cleanup: vi.fn(),
    });
  });

  it('should create a weather station with valid config', () => {
    const config: WeatherStationConfig = {
      id: '1',
      name: 'Test Station',
      latitude: 45.5 as Latitude,
      longitude: -73.5 as Longitude,
      elevation: 100,
    };

    const station = useWeatherStation(config);

    expect(station).toEqual({
      id: '1',
      name: 'Test Station',
      latitude: 45.5,
      longitude: -73.5,
      elevation: 100,
      weatherData$: expect.any(Object),
      cleanup: expect.any(Function),
    });
    expect(createWeatherSimulation).toHaveBeenCalled();
    expect(vi.mocked(createWeatherSimulation).mock.results[0].value.startSimulation).toHaveBeenCalled();
  });

  it('should throw an error for invalid latitude', () => {
    vi.mocked(isValidLatitude).mockReturnValue(false);

    const config: WeatherStationConfig = {
      id: '1',
      name: 'Test Station',
      latitude: 100 as Latitude,
      longitude: -73.5 as Longitude,
      elevation: 100,
    };

    expect(() => useWeatherStation(config)).toThrow('Latitude invalide: 100');
  });

  it('should throw an error for invalid longitude', () => {
    vi.mocked(isValidLongitude).mockReturnValue(false);

    const config: WeatherStationConfig = {
      id: '1',
      name: 'Test Station',
      latitude: 45.5 as Latitude,
      longitude: -200 as Longitude,
      elevation: 100,
    };

    expect(() => useWeatherStation(config)).toThrow('Longitude invalide: -200');
  });

  it('should call cleanup when the station is cleaned up', () => {
    const config: WeatherStationConfig = {
      id: '1',
      name: 'Test Station',
      latitude: 45.5 as Latitude,
      longitude: -73.5 as Longitude,
      elevation: 100,
    };

    const station = useWeatherStation(config);
    station.cleanup();

    expect(vi.mocked(createWeatherSimulation).mock.results[0].value.cleanup).toHaveBeenCalled();
  });
});
