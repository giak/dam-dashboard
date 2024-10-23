import type { WeatherDataInterface } from '@type/weather/WeatherStationInterface';
import { 
  Observable, 
  interval, 
  asyncScheduler,
  queueScheduler, 
  Subscription, 
  Subject, 
  timer, 
  EMPTY,
  ReplaySubject
} from 'rxjs';
import { 
  map, 
  tap, 
  share, 
  observeOn, 
  takeUntil, 
  finalize, 
  retry, 
  catchError,
  distinctUntilKeyChanged,
  debounceTime,
  bufferTime,
  filter
} from 'rxjs/operators';
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
 * Crée une simulation météorologique avec gestion optimisée des performances
 * @param updateInterval - Intervalle de mise à jour en millisecondes
 * @returns WeatherSimulationInterface
 */
export function createWeatherSimulation(updateInterval: number = DEFAULT_UPDATE_INTERVAL): WeatherSimulationInterface {
  const destroy$ = new Subject<void>();
  const weatherData = new ReplaySubject<WeatherDataInterface>(1);
  let simulationSubscription: Subscription | null = null;
  let currentWeather = generateRandomWeatherData();
  weatherData.next(currentWeather);

  // Optimisation : Flux de données avec gestion avancée et bufferTime
  const weatherData$ = weatherData.pipe(
    observeOn(asyncScheduler),
    bufferTime(100, undefined, 5), // Buffer max 5 items sur 100ms
    filter((updates): updates is WeatherDataInterface[] => updates.length > 0),
    map(updates => updates[updates.length - 1]),
    distinctUntilKeyChanged('temperature'),
    debounceTime(100),
    takeUntil(destroy$),
    finalize(() => {
      loggingService.info('Weather data stream finalized', 'weatherSimulation');
    }),
    catchError(error => {
      loggingService.error('Error in weather data stream', 'weatherSimulation', { error });
      return EMPTY;
    }),
    share()
  ) as Observable<WeatherDataInterface>;

  // Création du flux de simulation avec calculs optimisés
  const simulation$ = interval(updateInterval, asyncScheduler).pipe(
    observeOn(queueScheduler),
    map(() => {
      const newData: WeatherDataInterface = {
        temperature: Math.max(WEATHER_LIMITS.TEMP_MIN, 
          Math.min(WEATHER_LIMITS.TEMP_MAX, 
            currentWeather.temperature + (Math.random() - 0.5) * 2)),
        precipitation: Math.max(0, 
          Math.min(WEATHER_LIMITS.PRECIP_MAX, 
            currentWeather.precipitation + (Math.random() - 0.5) * 2)),
        windSpeed: Math.max(0, 
          Math.min(WEATHER_LIMITS.WIND_MAX, 
            currentWeather.windSpeed + (Math.random() - 0.5) * 5)),
        solarRadiation: Math.max(0, 
          Math.min(WEATHER_LIMITS.SOLAR_MAX, 
            currentWeather.solarRadiation + (Math.random() - 0.5) * 100)),
        timestamp: new Date()
      };
      currentWeather = newData;
      return newData;
    }),
    retry({
      count: 3,
      delay: (error, retryCount) => {
        loggingService.error('Simulation error, retrying...', 'weatherSimulation', { 
          error, 
          retryCount 
        });
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      }
    }),
    tap({
      next: (data) => {
        asyncScheduler.schedule(() => {
          loggingService.info('Weather data updated', 'weatherSimulation', { data });
        }, 0, { priority: -1 });
      },
      error: (error) => {
        loggingService.error('Simulation error', 'weatherSimulation', { error });
      },
      finalize: () => {
        loggingService.info('Simulation finalized', 'weatherSimulation');
      }
    }),
    takeUntil(destroy$),
    share()
  ) as Observable<WeatherDataInterface>;

  function startSimulation(): void {
    if (!simulationSubscription) {
      simulationSubscription = simulation$.subscribe({
        next: newData => weatherData.next(newData),
        error: (error) => {
          loggingService.error('Simulation error', 'weatherSimulation', { error });
        }
      });
      loggingService.info('Weather simulation started', 'weatherSimulation');
    }
  }

  function stopSimulation(): void {
    if (simulationSubscription) {
      simulationSubscription.unsubscribe();
      simulationSubscription = null;
      loggingService.info('Weather simulation stopped', 'weatherSimulation');
    }
  }

  function cleanup(): void {
    destroy$.next();
    destroy$.complete();
    stopSimulation();
    weatherData.complete();
    loggingService.info('Weather simulation cleaned up', 'weatherSimulation');
  }

  return {
    weatherData$,
    startSimulation,
    stopSimulation,
    cleanup
  };
}
