import type { RiverStateInterface, RiverUpdateInterface } from '@type/river/RiverInterface';

export class RiverValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiverValidationError';
  }
}

export function validateRiverUpdate(update: RiverUpdateInterface): void {
  if (update.flowRate !== undefined && update.flowRate < 0) {
    throw new RiverValidationError("Flow rate cannot be negative");
  }
  if (update.waterVolume !== undefined && update.waterVolume < 0) {
    throw new RiverValidationError("Water volume cannot be negative");
  }
  if (update.waterLevel !== undefined && update.waterLevel < 0) {
    throw new RiverValidationError("Water level cannot be negative");
  }
  if (update.pollutionLevel !== undefined && (update.pollutionLevel < 0 || update.pollutionLevel > 1)) {
    throw new RiverValidationError("Pollution level must be between 0 and 1");
  }
}

export function updateRiverState(
  currentState: RiverStateInterface,
  precipitationMm: number,
  timeInterval: number,
  baseFlowRate: number,
  precipitationImpactFactor: number
): RiverStateInterface {
  const adjustedFlowRate = baseFlowRate + (precipitationMm * precipitationImpactFactor);
  const newWaterVolume = currentState.waterVolume + (precipitationMm * currentState.catchmentArea / 1000); // Convert mm to m³
  const newFlowRate = adjustedFlowRate;

  return {
    ...currentState,
    waterVolume: newWaterVolume,
    flowRate: newFlowRate,
    lastUpdated: new Date()
  };
}
