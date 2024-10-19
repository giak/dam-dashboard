import { ref, onUnmounted } from 'vue';
import { useWeatherStation } from './useWeatherStation';
import type { 
  MainWeatherStationInterface, 
  WeatherStationInterface, 
  WeatherDataInterface,
  WeatherStationConfig
} from '@/types/weather/WeatherStationInterface';
import { combineLatest, map, catchError } from 'rxjs';
import { loggingService } from '@/services/loggingService';

const TEMPERATURE_PRECISION = 2;
const PRECIPITATION_PRECISION = 2;

/**
 * Crée et gère une station météo principale avec plusieurs sous-stations
 * @param id - Identifiant unique de la station principale
 * @param name - Nom de la station principale
 * @param subStationConfigs - Configurations des sous-stations
 * @returns MainWeatherStationInterface
 */
export function useMainWeatherStation(
  id: string,
  name: string,
  subStationConfigs: WeatherStationConfig[]
): MainWeatherStationInterface {
  const subStations = subStationConfigs.map(config => useWeatherStation(config));

  const averageTemperature = ref(0);
  const totalPrecipitation = ref(0);
  const lastUpdate = ref(new Date());

  const combinedWeatherData$ = combineLatest(
    subStations.map(station => station.weatherData$)
  ).pipe(
    map((dataArray: WeatherDataInterface[]) => {
      const tempSum = dataArray.reduce((sum, data) => sum + data.temperature, 0);
      const precipSum = dataArray.reduce((sum, data) => sum + data.precipitation, 0);
      const stationCount = dataArray.length;
      
      averageTemperature.value = Number((tempSum / stationCount).toFixed(TEMPERATURE_PRECISION));
      totalPrecipitation.value = Number(precipSum.toFixed(PRECIPITATION_PRECISION));
      lastUpdate.value = new Date();

      return {
        averageTemperature: averageTemperature.value,
        totalPrecipitation: totalPrecipitation.value,
        lastUpdate: lastUpdate.value
      };
    }),
    catchError(error => {
      loggingService.error('Erreur lors du traitement des données météo', 'useMainWeatherStation', { error });
      return [];
    })
  );

  const subscription = combinedWeatherData$.subscribe();

  onUnmounted(() => {
    subscription.unsubscribe();
    subStations.forEach(station => station.cleanup());
    loggingService.info('Station météo principale nettoyée', 'useMainWeatherStation', { stationId: id });
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
