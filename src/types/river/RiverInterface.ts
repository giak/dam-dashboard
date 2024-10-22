import type { Observable } from 'rxjs';
import type { ComputedRef } from 'vue';

export interface RiverStateInterface {
  id: string;
  name: string;
  flowRate: number;
  waterVolume: number;
  lastUpdated: Date;
  waterLevel: number;
  temperature: number;
  pollutionLevel: number;
  catchmentArea: number;
}

export interface RiverUpdateInterface {
  flowRate?: number;
  waterVolume?: number;
  waterLevel?: number;
  temperature?: number;
  pollutionLevel?: number;
}

export interface RiverObservablesInterface {
  riverState$: Observable<RiverStateInterface>;
  outflowRate$: Observable<number>;
}

export interface RiverActionsInterface {
  startSimulation: () => () => void;
  updateRiver: (update: RiverUpdateInterface) => void;
  cleanup: () => void;
}

export type UseRiverReturnInterface = RiverObservablesInterface & RiverActionsInterface & {
  riverState: ComputedRef<RiverStateInterface>;
  _updateRiverState: (precipitationMm: number) => void;
  flowRate: ComputedRef<number>;
  waterVolume: ComputedRef<number>;
};
