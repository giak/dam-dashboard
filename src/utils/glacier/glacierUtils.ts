import type { GlacierStateInterface, GlacierUpdateInterface } from '@type/glacier/GlacierInterface';

export class GlacierValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GlacierValidationError';
  }
}

export function validateGlacierUpdate(update: GlacierUpdateInterface): void {
  if (update.volume !== undefined && update.volume < 0) {
    throw new GlacierValidationError("Volume cannot be negative");
  }
  if (update.meltRate !== undefined && update.meltRate < 0) {
    throw new GlacierValidationError("Melt rate cannot be negative");
  }
  if (update.outflowRate !== undefined && update.outflowRate < 0) {
    throw new GlacierValidationError("Outflow rate cannot be negative");
  }
}

export function updateGlacierState(
  currentState: GlacierStateInterface,
  temperatureCelsius: number,
  timeInterval: number,
  baseMeltRate: number,
  temperatureImpactFactor: number
): GlacierStateInterface {
  const adjustedMeltRate = baseMeltRate + (temperatureCelsius * temperatureImpactFactor);
  const newVolume = Math.max(0, currentState.volume - adjustedMeltRate * timeInterval / 1000);
  const newOutflowRate = adjustedMeltRate * (newVolume / currentState.volume);

  return {
    ...currentState,
    volume: newVolume,
    meltRate: adjustedMeltRate,
    outflowRate: newOutflowRate,
    lastUpdated: new Date()
  };
}
