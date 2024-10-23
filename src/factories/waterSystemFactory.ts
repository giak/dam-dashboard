import { useWaterSystem } from '@composables/useWaterSystem';
import { errorHandlingService } from '@services/errorHandlingService';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import type { WaterSystemInterface } from '@type/waterSystem';

export interface WaterSystemDependenciesInterface {
  createDamService: typeof import('@services/damService').createDamService;
  createGlacierService: typeof import('@services/glacierService').createGlacierService;
  createRiverService: typeof import('@services/riverService').createRiverService;
  createWeatherService: typeof import('@services/weatherService').createWeatherService;
  errorHandlingService: typeof errorHandlingService;
  loggingService: typeof loggingService;
  createInflowAggregator: typeof createInflowAggregator;
}

export function createWaterSystem(dependencies: WaterSystemDependenciesInterface): WaterSystemInterface {
  return useWaterSystem(dependencies);
}
