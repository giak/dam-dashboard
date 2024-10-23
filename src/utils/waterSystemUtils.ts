import type { DamServiceInterface } from '@services/damService';
import type { GlacierServiceInterface } from '@services/glacierService';
import type { RiverServiceInterface } from '@services/riverService';
import type { WeatherServiceInterface } from '@services/weatherService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export function createServicesUtil() {
  return {
    damService: null as DamServiceInterface | null,
    glacierService: null as GlacierServiceInterface | null,
    riverService: null as RiverServiceInterface | null,
    weatherService: null as WeatherServiceInterface | null
  };
}

export function createStatesUtil() {
  return {
    damState$: new BehaviorSubject<DamInterface | null>(null),
    glacierState$: new BehaviorSubject<GlacierStateInterface | null>(null),
    riverState$: new BehaviorSubject<RiverStateInterface | null>(null),
    mainWeatherState$: new BehaviorSubject<MainWeatherStationInterface | null>(null)
  };
}

export function createTotalInflowObservableUtil(aggregatedInflow$: Observable<{ totalInflow: number }>) {
  return aggregatedInflow$.pipe(
    map(aggregatedInflow => aggregatedInflow.totalInflow)
  );
}

export function calculateTotalWaterVolumeUtil(dam: DamInterface | null, river: RiverStateInterface | null): number {
  if (!dam || !river) return 0;
  return dam.currentWaterLevel * dam.maxCapacity + river.waterVolume;
}
