import type { ErrorDataInterface } from '@services/errorHandlingService';
import type { createInflowAggregator } from '@services/inflowAggregator';
import type { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { MainWeatherStationInterface, WeatherStationInterface } from '@type/weather/WeatherStationInterface';
import type { Observable } from 'rxjs';

export interface SystemStateInterface {
  dam: DamInterface | null;
  glacier: GlacierStateInterface | null;
  river: RiverStateInterface | null;
  mainWeather: MainWeatherStationInterface | null;
}

export interface WaterSystemInterface {
  initializeDam: (initialData: DamInterface) => void;
  initializeGlacier: (initialData: GlacierStateInterface) => void;
  initializeRiver: (initialData: RiverStateInterface) => void;
  initializeMainWeatherStation: (
    id: string,
    name: string,
    subStationConfigs: Array<Omit<WeatherStationInterface, 'weatherData$' | 'cleanup'>>
  ) => void;
  systemState$: Observable<SystemStateInterface>;
  totalWaterVolume$: Observable<number>;
  cleanup: () => void;
  error$: Observable<ErrorDataInterface | null>;
}

export interface WaterSystemDependenciesInterface {
  createDamService: typeof import('@services/damService').createDamService;
  createGlacierService: typeof import('@services/glacierService').createGlacierService;
  createRiverService: typeof import('@services/riverService').createRiverService;
  createWeatherService: typeof import('@services/weatherService').createWeatherService;
  errorHandlingService: typeof import('@services/errorHandlingService').errorHandlingService;
  loggingService: typeof loggingService;
  createInflowAggregator: typeof createInflowAggregator;
}
