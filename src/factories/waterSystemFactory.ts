import type { WaterSystemInterface } from '@type/waterSystem';
import type { DamServiceInterface } from '@services/damService';
import type { GlacierServiceInterface } from '@services/glacierService';
import type { RiverServiceInterface } from '@services/riverService';
import type { WeatherServiceInterface } from '@services/weatherService';
import { useWaterSystem } from '@composables/useWaterSystem';

export interface WaterSystemDependencies {
  createDamService: typeof import('@services/damService').createDamService;
  createGlacierService: typeof import('@services/glacierService').createGlacierService;
  createRiverService: typeof import('@services/riverService').createRiverService;
  createWeatherService: typeof import('@services/weatherService').createWeatherService;
}

export function createWaterSystem(dependencies: WaterSystemDependencies): WaterSystemInterface {
  return useWaterSystem(dependencies);
}
