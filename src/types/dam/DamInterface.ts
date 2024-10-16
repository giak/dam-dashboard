export interface DamInterface {
  id: string;
  name: string;
  currentWaterLevel: number;
  maxCapacity: number;
  maxWaterLevel: number;
  minWaterLevel: number;
  outflowRate: number;
  inflowRate: number;
  lastUpdated: Date;
}

export interface DamUpdateInterface {
  currentWaterLevel?: number;
  outflowRate?: number;
  inflowRate?: number;
  lastUpdated?: Date;
}
