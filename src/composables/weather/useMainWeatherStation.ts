import { loggingService } from '@services/loggingService';
import type {
  MainWeatherStationInterface,
  WeatherDataInterface,
  WeatherStationConfig,
  WeatherStationInterface
} from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, Observable, asyncScheduler, combineLatest, distinctUntilChanged, shareReplay } from 'rxjs';
import { debounceTime, observeOn, tap } from 'rxjs/operators';
import { computed, onUnmounted, ref, type ComputedRef } from 'vue';
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
  return combineLatest(subStations.map(station => station.weatherData$)).pipe(
    observeOn(asyncScheduler),
    debounceTime(100), // Évite les mises à jour trop fréquentes
    distinctUntilChanged((prev, curr) => 
      prev.length === curr.length &&
      prev.every((data, index) => 
        data.temperature === curr[index].temperature &&
        data.precipitation === curr[index].precipitation
      )
    ),
    tap(data => {
      asyncScheduler.schedule(() => {
        loggingService.info('Combined weather data updated', 'useMainWeatherStation', { 
          stationCount: data.length 
        });
      });
    }),
    shareReplay(1)
  );
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
  subStationConfigs: WeatherStationConfig[]
): MainWeatherStationInterface & { temperature$: Observable<number>, precipitation$: Observable<number> } {
  const subStations = subStationConfigs.map(config => useWeatherStation(config));

  const averageTemperature = ref(0);
  const totalPrecipitation = ref(0);
  const lastUpdate = ref(new Date());

  const temperature$ = new BehaviorSubject<number>(0);
  const precipitation$ = new BehaviorSubject<number>(0);

  // Optimisation des flux avec scheduler
  const sharedTemperature$ = temperature$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const sharedPrecipitation$ = precipitation$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const updateWeatherData = (weatherData: WeatherDataInterface[]) => {
    // Déplacer les calculs vers asyncScheduler
    asyncScheduler.schedule(() => {
      const newTemp = calculateAverageTemperature(weatherData);
      const newPrecip = calculateTotalPrecipitation(weatherData);

      // Mise à jour uniquement si les valeurs ont changé
      if (newTemp !== averageTemperature.value) {
        averageTemperature.value = newTemp;
        temperature$.next(newTemp);
      }

      if (newPrecip !== totalPrecipitation.value) {
        totalPrecipitation.value = newPrecip;
        precipitation$.next(newPrecip);
      }

      lastUpdate.value = new Date();

      // Logging asynchrone
      asyncScheduler.schedule(() => {
        loggingService.info('Weather data updated', 'useMainWeatherStation', { 
          averageTemperature: averageTemperature.value, 
          totalPrecipitation: totalPrecipitation.value 
        });
      });
    });
  };

  const combinedWeatherData$ = createCombinedWeatherData$(subStations);

  const subscription = combinedWeatherData$.subscribe(updateWeatherData);

  onUnmounted(() => {
    asyncScheduler.schedule(() => {
      subscription.unsubscribe();
      subStations.forEach(station => station.cleanup());
      temperature$.complete();
      precipitation$.complete();
      loggingService.info('Main weather station cleaned up', 'useMainWeatherStation');
    });
  });

  return {
    id,
    name,
    subStations,
    averageTemperature: computed(() => averageTemperature.value),
    totalPrecipitation: computed(() => totalPrecipitation.value),
    lastUpdate: lastUpdate.value,
    temperature$: sharedTemperature$,
    precipitation$: sharedPrecipitation$
  };
}
