import { createWeatherSimulation } from '@/services/weatherSimulation';
import type {
    Latitude,
    Longitude,
    WeatherStationConfig,
    WeatherStationInterface
} from '@/types/weather/WeatherStationInterface';
import { isValidLatitude, isValidLongitude } from '@/types/weather/WeatherStationInterface';

/**
 * Composable pour gérer une sous-station météo
 * @param config - Configuration de la station météo
 * @returns WeatherStationInterface
 * @throws Error si la latitude ou la longitude sont invalides
 */
export function useWeatherStation(config: WeatherStationConfig): WeatherStationInterface {
  const { id, name, latitude, longitude, elevation } = config;

  if (!isValidLatitude(latitude)) {
    throw new Error(`Latitude invalide: ${latitude}`);
  }

  if (!isValidLongitude(longitude)) {
    throw new Error(`Longitude invalide: ${longitude}`);
  }

  const { weatherData$, startSimulation, stopSimulation, cleanup } = createWeatherSimulation();

  // Démarrer la simulation immédiatement
  startSimulation();

  return {
    id,
    name,
    latitude: latitude as Latitude,
    longitude: longitude as Longitude,
    elevation,
    weatherData$,
    cleanup
  };
}
