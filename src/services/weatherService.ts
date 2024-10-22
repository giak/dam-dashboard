import type { MainWeatherStationInterface, WeatherDataInterface, WeatherStationConfig, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, Observable, combineLatest, interval } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
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

  const updateMainWeatherState = (weatherData: WeatherDataInterface[]): void => {
    const averageTemperature = weatherData.reduce((sum, data) => sum + data.temperature, 0) / weatherData.length;
    const totalPrecipitation = weatherData.reduce((sum, data) => sum + data.precipitation, 0);

    const currentState = mainWeatherState$.getValue();
    const newState: MainWeatherStationInterface = {
      ...currentState,
      averageTemperature,
      totalPrecipitation,
      lastUpdate: new Date()
    };

    mainWeatherState$.next(newState);
    (newState.temperature$ as BehaviorSubject<number>).next(averageTemperature);
    (newState.precipitation$ as BehaviorSubject<number>).next(totalPrecipitation);

    loggingService.info('Main weather state updated', 'WeatherService', { newState });
  };

  const startSimulation = (): (() => void) => {
    const subscription = interval(SIMULATION_INTERVAL).pipe(
      switchMap(() => combineLatest(subStations.map(station => station.weatherData$)))
    ).subscribe(updateMainWeatherState);

    return () => subscription.unsubscribe();
  };

  const cleanup = (): void => {
    subStations.forEach(station => station.cleanup());
    mainWeatherState$.complete();
  };

  return {
    getMainWeatherState$: () => mainWeatherState$.asObservable(),
    getTemperature$: () => mainWeatherState$.pipe(
      map(state => typeof state.averageTemperature === 'number' ? state.averageTemperature : state.averageTemperature.value),
      shareReplay(1)
    ),
    getPrecipitation$: () => mainWeatherState$.pipe(
      map(state => typeof state.totalPrecipitation === 'number' ? state.totalPrecipitation : state.totalPrecipitation.value),
      shareReplay(1)
    ),
    startSimulation,
    cleanup
  };
}
