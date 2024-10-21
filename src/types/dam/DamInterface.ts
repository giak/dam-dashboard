import type { AggregatedInflowInterface } from '@services/inflowAggregator';
import { Observable } from 'rxjs';

export interface DamInterface {
  id: string;
  name: string;
  currentWaterLevel: number;
  minWaterLevel: number;
  maxWaterLevel: number;
  maxCapacity: number;
  inflowRate: number;
  outflowRate: number;
  lastUpdated: Date;
}

export type DamUpdateInterface = Partial<Omit<DamInterface, 'id' | 'name' | 'lastUpdated'>>;

export interface DamSimulationStateInterface {
  currentWaterLevel: number;
  inflowRate: number;
  outflowRate: number;
}

export interface DamObservablesInterface {
  damState$: Observable<DamInterface>;
  currentWaterLevel$: Observable<number>;
  outflowRate$: Observable<number>;
}

export interface DamActionsInterface {
  updateDam: (update: DamUpdateInterface) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}

export type UseDamReturnInterface = DamObservablesInterface & DamActionsInterface & {
  _simulateStep: (inflow: AggregatedInflowInterface) => void;
};
