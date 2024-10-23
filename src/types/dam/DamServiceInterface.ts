import type { BehaviorSubject, Observable } from "rxjs";
import type { DamInterface } from "./DamInterface";

export interface DamServiceInterface {
  getDamState$: () => BehaviorSubject<DamInterface>;
  getCurrentWaterLevel$: () => BehaviorSubject<number>;
  updateDam: (update: Partial<DamInterface>) => void;
  startSimulation: () => () => void;
  cleanup: () => void;
}
