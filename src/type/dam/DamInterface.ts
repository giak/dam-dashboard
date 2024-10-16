export interface DamInterface {
  id: string;
  name: string;
  currentWaterLevel: number;
  maxWaterLevel: number;
  minWaterLevel: number;
  outflowRate: number;
  inflowRate: number;
  lastUpdated: Date;
}
