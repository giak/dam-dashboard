import { browserConfig } from '@config/browserEnv';
import { calculateNetFlow, calculateNewWaterLevel, calculateWaterLevelChange, simulateFlowRate } from '@domain/dam';
import type { DamInterface, DamUpdateInterface } from '@type/dam/DamInterface';

export class DamValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DamValidationError';
    }
  }

  export function validateDamUpdate(update: DamUpdateInterface): void {
    if (update.currentWaterLevel !== undefined) {
      if (isNaN(update.currentWaterLevel)) {
        throw new DamValidationError("Invalid water level: must be a number");
      }
      if (update.currentWaterLevel < 0) {
        throw new DamValidationError("Invalid water level: cannot be negative");
      }
    }
    if (update.outflowRate !== undefined) {
      if (isNaN(update.outflowRate)) {
        throw new DamValidationError("Invalid outflow rate: must be a number");
      }
      if (update.outflowRate < 0) {
        throw new DamValidationError("Invalid outflow rate: cannot be negative");
      }
    }
    // Add more validations as needed
  }

export function updateDamState(currentState: DamInterface, timeInterval: number, totalInflow: number): DamInterface {
  const netFlow = calculateNetFlow(totalInflow, currentState.outflowRate);
  const waterLevelChange = calculateWaterLevelChange(netFlow, timeInterval, browserConfig.damSurfaceArea);
  const newWaterLevel = calculateNewWaterLevel(
    currentState.currentWaterLevel,
    waterLevelChange,
    currentState.minWaterLevel,
    currentState.maxWaterLevel
  );

  const adjustedWaterLevel = newWaterLevel === currentState.currentWaterLevel 
    ? newWaterLevel + 0.001 
    : newWaterLevel;

  return {
    ...currentState,
    currentWaterLevel: adjustedWaterLevel,
    inflowRate: totalInflow,
    outflowRate: simulateFlowRate(currentState.outflowRate, browserConfig.maxFlowRateChange),
    lastUpdated: new Date(),
  };
}