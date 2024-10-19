import { loggingService } from '@/services/loggingService';
import type {
    MainWeatherStationInterface,
    WeatherDataInterface,
    WeatherStationConfig,
    WeatherStationInterface
} from '@/types/weather/WeatherStationInterface';
import { combineLatest, map, Observable } from 'rxjs';
import { onUnmounted, ref, type Ref } from 'vue';
import { useWeatherStation } from './useWeatherStation';

const TEMPERATURE_PRECISION = 2;
const PRECIPITATION_PRECISION = 2;

/**
 * Calcule la température moyenne à partir d'un tableau de données météorologiques
 * @param dataArray Tableau de données météorologiques
 * @returns La température moyenne
 */
export function calculateAverageTemperature(dataArray: WeatherDataInterface[]): number {
  const tempSum = dataArray.reduce((sum, data) => sum + data.temperature, 0);
  return Number((tempSum / dataArray.length).toFixed(TEMPERATURE_PRECISION));
}

/**
 * Calcule les précipitations totales à partir d'un tableau de données météorologiques
 * @param dataArray Tableau de données météorologiques
 * @returns Les précipitations totales
 */
export function calculateTotalPrecipitation(dataArray: WeatherDataInterface[]): number {
  const precipSum = dataArray.reduce((sum, data) => sum + data.precipitation, 0);
  return Number(precipSum.toFixed(PRECIPITATION_PRECISION));
}

/**
 * Crée un observable qui combine les données météorologiques de plusieurs stations
 * @param subStations Tableau de sous-stations météorologiques
 * @returns Observable de données météorologiques combinées
 */
export function createCombinedWeatherData$(subStations: WeatherStationInterface[]): Observable<WeatherDataInterface[]> {
  return combineLatest(subStations.map(station => station.weatherData$));
}

/**
 * Crée et gère une station météo principale avec plusieurs sous-stations
 * @param id Identifiant unique de la station principale
 * @param name Nom de la station principale
 * @param subStationConfigs Configurations des sous-stations
 * @returns MainWeatherStationInterface
 */
export function useMainWeatherStation(
  id: string,
  name: string,
  subStationConfigs: WeatherStationConfig[] = []  // Ajoutez une valeur par défaut
): MainWeatherStationInterface {
  const subStations = subStationConfigs.map(config => useWeatherStation(config));

  const averageTemperature: Ref<number> = ref(0);
  const totalPrecipitation: Ref<number> = ref(0);
  const lastUpdate: Ref<Date> = ref(new Date());

  const combinedWeatherData$ = createCombinedWeatherData$(subStations);

  const subscription = combinedWeatherData$.pipe(
    map((dataArray: WeatherDataInterface[]) => {
      averageTemperature.value = calculateAverageTemperature(dataArray);
      totalPrecipitation.value = calculateTotalPrecipitation(dataArray);
      lastUpdate.value = new Date();

      return {
        averageTemperature: averageTemperature.value,
        totalPrecipitation: totalPrecipitation.value,
        lastUpdate: lastUpdate.value
      };
    })
  ).subscribe({
    next: (data) => {
      loggingService.info('Weather data updated', 'useMainWeatherStation', data);
    },
    error: (error) => {
      loggingService.error('Error processing weather data', 'useMainWeatherStation', { error });
    }
  });

  onUnmounted(() => {
    subscription.unsubscribe();
    subStations.forEach(station => station.cleanup());
    loggingService.info('Main weather station cleaned up', 'useMainWeatherStation', { stationId: id });
  });

  return {
    id,
    name,
    subStations,
    averageTemperature,
    totalPrecipitation,
    lastUpdate
  };
}
