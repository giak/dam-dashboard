import type { Observable } from 'rxjs';
import type { ComputedRef } from 'vue';

export interface GlacierStateInterface {
  id: string;
  name: string;
  volume: number;
  meltRate: number;
  outflowRate: number;
  lastUpdated: Date;
  elevation: number;
  area: number;
  temperature: number;
  flow: number;
}

export interface GlacierUpdateInterface {
  volume?: number;
  meltRate?: number;
  outflowRate?: number;
  temperature?: number;
  flow?: number;
}

export interface GlacierObservablesInterface {
  glacierState$: Observable<GlacierStateInterface>;
  outflowRate$: Observable<number>;
}

export interface GlacierActionsInterface {
  startSimulation: () => () => void;
  updateGlacier: (update: GlacierUpdateInterface) => void;
  cleanup: () => void;
}

export type UseGlacierReturnInterface = GlacierObservablesInterface & GlacierActionsInterface & {
  glacierState: ComputedRef<GlacierStateInterface>;
  _updateGlacierState: (temperatureCelsius: number) => void;
  volume: ComputedRef<number>;
  outflowRate: ComputedRef<number>;
};
