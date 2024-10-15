import type { DamInterface } from '@type/dam/DamInterface';

export function calculateNetFlow(inflow: number, outflow: number): number {
  return inflow - outflow;
}

export function calculateWaterLevelChange(netFlow: number, timeInterval: number, surfaceArea: number): number {
  return (netFlow * timeInterval) / surfaceArea;
}

export function calculateNewWaterLevel(currentLevel: number, change: number, minLevel: number, maxLevel: number): number {
  return Math.max(minLevel, Math.min(maxLevel, currentLevel + change));
}

export function simulateFlowRate(currentRate: number, maxChange: number = 2): number {
  return Math.max(0, currentRate + (Math.random() - 0.5) * maxChange);
}

export function updateDamState(dam: DamInterface, timeInterval: number, surfaceArea: number): DamInterface {
  const netFlow = calculateNetFlow(dam.inflowRate, dam.outflowRate);
  const waterLevelChange = calculateWaterLevelChange(netFlow, timeInterval, surfaceArea);
  const newWaterLevel = calculateNewWaterLevel(dam.currentWaterLevel, waterLevelChange, dam.minWaterLevel, dam.maxWaterLevel);

  return {
    ...dam,
    currentWaterLevel: newWaterLevel,
    inflowRate: simulateFlowRate(dam.inflowRate),
    outflowRate: simulateFlowRate(dam.outflowRate),
    lastUpdated: new Date(),
  };
}
