import type { MainWeatherStationInterface, WeatherDataInterface, WeatherStationConfig, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, Observable, asyncScheduler, combineLatest, distinctUntilChanged, interval, timer, EMPTY, queueScheduler } from 'rxjs';
import { map, observeOn, switchMap, shareReplay, retry, catchError, bufferTime, filter } from 'rxjs/operators';
import { loggingService } from './loggingService';
import { createWeatherSimulation } from './weatherSimulation';

const SIMULATION_INTERVAL = 5000; // 5 secondes en millisecondes

export interface WeatherServiceInterface {
  getMainWeatherState$: () => Observable<MainWeatherStationInterface>;
  getTemperature$: () => Observable<number>;
  getPrecipitation$: () => Observable<number>;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export function createWeatherService(
  id: string,
  name: string,
  subStationConfigs: WeatherStationConfig[]
): WeatherServiceInterface {
  const subStations: WeatherStationInterface[] = subStationConfigs.map(config => {
    const { weatherData$, startSimulation, cleanup } = createWeatherSimulation(SIMULATION_INTERVAL);
    startSimulation();
    return {
      ...config,
      weatherData$,
      cleanup
    };
  });

  const mainWeatherState$ = new BehaviorSubject<MainWeatherStationInterface>({
    id,
    name,
    subStations,
    averageTemperature: 0,
    totalPrecipitation: 0,
    lastUpdate: new Date(),
    temperature$: new BehaviorSubject(0),
    precipitation$: new BehaviorSubject(0)
  });

  // Utilisation de queueScheduler pour les calculs intensifs
  const updateMainWeatherState = (weatherData: WeatherDataInterface[]): void => {
    queueScheduler.schedule(() => {
      const averageTemperature = weatherData.reduce((sum, data) => sum + data.temperature, 0) / weatherData.length;
      const totalPrecipitation = weatherData.reduce((sum, data) => sum + data.precipitation, 0);

      // Mise à jour d'état via asyncScheduler
      asyncScheduler.schedule(() => {
        const currentState = mainWeatherState$.getValue();
        const newState = {
          ...currentState,
          averageTemperature,
          totalPrecipitation,
          lastUpdate: new Date()
        };

        mainWeatherState$.next(newState);
        (newState.temperature$ as BehaviorSubject<number>).next(averageTemperature);
        (newState.precipitation$ as BehaviorSubject<number>).next(totalPrecipitation);

        // Logging asynchrone avec priorité basse
        asyncScheduler.schedule(() => {
          loggingService.info('Main weather state updated', 'WeatherService', { newState });
        }, 0, { priority: -1 });
      });
    });
  };

  // Optimisation des calculs en lots
  const combinedWeatherData$ = combineLatest(
    subStations.map(station => station.weatherData$)
  ).pipe(
    bufferTime(100, undefined, 10), // Regroupe les mises à jour, max 10 items
    filter(batch => batch.length > 0),
    observeOn(queueScheduler),
    map(batch => batch[batch.length - 1]), // Prend la dernière mise à jour
    distinctUntilChanged((prev, curr) => 
      JSON.stringify(prev) === JSON.stringify(curr)
    ),
    retry({
      delay: (error, retryCount) => {
        loggingService.error('Weather data error, retrying...', 'WeatherService', { 
          error, 
          retryCount 
        });
        return timer(Math.min(1000 * Math.pow(2, retryCount), 10000));
      },
      count: 3
    }),
    catchError(error => {
      loggingService.error('Max retries reached', 'WeatherService', { error });
      return EMPTY;
    }),
    shareReplay(1)
  );

  const startSimulation = (): (() => void) => {
    const subscription = interval(SIMULATION_INTERVAL, asyncScheduler).pipe(
      switchMap(() => combinedWeatherData$)
    ).subscribe(updateMainWeatherState);

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    subStations.forEach(station => station.cleanup());
    mainWeatherState$.complete();
  };

  // Optimisation des observables exposés
  return {
    getMainWeatherState$: () => mainWeatherState$.pipe(
      observeOn(asyncScheduler),
      shareReplay(1)
    ),
    getTemperature$: () => mainWeatherState$.pipe(
      observeOn(asyncScheduler),
      map(state => typeof state.averageTemperature === 'number' ? 
        state.averageTemperature : 
        state.averageTemperature.value
      ),
      shareReplay(1)
    ),
    getPrecipitation$: () => mainWeatherState$.pipe(
      observeOn(asyncScheduler),
      map(state => typeof state.totalPrecipitation === 'number' ? 
        state.totalPrecipitation : 
        state.totalPrecipitation.value
      ),
      shareReplay(1)
    ),
    startSimulation,
    cleanup
  };
}
