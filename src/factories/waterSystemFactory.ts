import { useWaterSystem } from '@composables/useWaterSystem';
import { createDamService } from '@services/damService';
import { errorHandlingService } from '@services/errorHandlingService';
import { createGlacierService } from '@services/glacierService';
import { createInflowAggregator } from '@services/inflowAggregator';
import { loggingService } from '@services/loggingService';
import { createRiverService } from '@services/riverService';
import { createWeatherService } from '@services/weatherService';
import type { WaterSystemDependenciesInterface, WaterSystemInterface } from '@type/waterSystem';

export function createWaterSystem(): WaterSystemInterface {
  const dependencies: WaterSystemDependenciesInterface = {
    createDamService,
    createGlacierService,
    createRiverService,
    createWeatherService,
    errorHandlingService,
    loggingService,
    createInflowAggregator
  };

  return useWaterSystem(dependencies);
}
