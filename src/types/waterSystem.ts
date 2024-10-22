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
  error$: Observable<string | null>;
}
