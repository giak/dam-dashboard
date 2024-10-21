import type { WeatherDataInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, Observable } from 'rxjs';
import { loggingService } from './loggingService';

export interface WeatherSimulationInterface {
  weatherData$: Observable<WeatherDataInterface>;
  startSimulation: () => void;
  stopSimulation: () => void;
  cleanup: () => void;
}

const DEFAULT_UPDATE_INTERVAL = 5000; // 5 secondes

const WEATHER_LIMITS = {
  TEMP_MIN: 10,
  TEMP_MAX: 40,
  PRECIP_MAX: 10,
  WIND_MAX: 20,
  SOLAR_MAX: 1000
};

/**
 * Génère des données météorologiques aléatoires
 * @returns WeatherDataInterface
 * @description generateRandomWeatherData is a function that generates random weather data.
 */
function generateRandomWeatherData(): WeatherDataInterface {
  return {
    temperature: Math.random() * (WEATHER_LIMITS.TEMP_MAX - WEATHER_LIMITS.TEMP_MIN) + WEATHER_LIMITS.TEMP_MIN,
    precipitation: Math.random() * WEATHER_LIMITS.PRECIP_MAX,
    windSpeed: Math.random() * WEATHER_LIMITS.WIND_MAX,
    solarRadiation: Math.random() * WEATHER_LIMITS.SOLAR_MAX,
    timestamp: new Date()
  };
}

/**
 * Crée une simulation météorologique
 * @param updateInterval - Intervalle de mise à jour en millisecondes
 * @returns WeatherSimulationInterface
 */
export function createWeatherSimulation(updateInterval: number = DEFAULT_UPDATE_INTERVAL): WeatherSimulationInterface {
  const weatherData = new BehaviorSubject<WeatherDataInterface>(generateRandomWeatherData());
  let simulationInterval: NodeJS.Timeout | null = null;
  let currentWeather = weatherData.getValue();

  /**
   * Met à jour les données météorologiques de manière plus réaliste
   */
  function updateWeatherData(): void {
    const newData: WeatherDataInterface = {
      temperature: Math.max(WEATHER_LIMITS.TEMP_MIN, Math.min(WEATHER_LIMITS.TEMP_MAX, currentWeather.temperature + (Math.random() - 0.5) * 2)),
      precipitation: Math.max(0, Math.min(WEATHER_LIMITS.PRECIP_MAX, currentWeather.precipitation + (Math.random() - 0.5) * 2)),
      windSpeed: Math.max(0, Math.min(WEATHER_LIMITS.WIND_MAX, currentWeather.windSpeed + (Math.random() - 0.5) * 5)),
      solarRadiation: Math.max(0, Math.min(WEATHER_LIMITS.SOLAR_MAX, currentWeather.solarRadiation + (Math.random() - 0.5) * 100)),
      timestamp: new Date()
    };
    currentWeather = newData;
    weatherData.next(newData);
    loggingService.info('Weather data updated', 'weatherSimulation', { newData });
  }

  function startSimulation(): void {
    if (!simulationInterval) {
      simulationInterval = setInterval(updateWeatherData, updateInterval);
      loggingService.info('Weather simulation started', 'weatherSimulation');
    }
  }

  function stopSimulation(): void {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      loggingService.info('Weather simulation stopped', 'weatherSimulation');
    }
  }

  function cleanup(): void {
    stopSimulation();
    weatherData.complete();
    loggingService.info('Weather simulation cleaned up', 'weatherSimulation');
  }

  return {
    weatherData$: weatherData.asObservable(),
    startSimulation,
    stopSimulation,
    cleanup
  };
}
