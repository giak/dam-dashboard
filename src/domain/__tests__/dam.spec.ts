import { describe, it, expect } from 'vitest';
import { calculateNetFlow, calculateWaterLevelChange, calculateNewWaterLevel, simulateFlowRate } from '../dam';

describe('Dam Domain Functions', () => {
  it('calculates net flow correctly', () => {
    expect(calculateNetFlow(10, 5)).toBe(5);
    expect(calculateNetFlow(5, 10)).toBe(-5);
  });

  it('calculates water level change correctly', () => {
    expect(calculateWaterLevelChange(5, 1, 100)).toBe(0.05);
  });

  it('calculates new water level within bounds', () => {
    expect(calculateNewWaterLevel(50, 10, 0, 100)).toBe(60);
    expect(calculateNewWaterLevel(95, 10, 0, 100)).toBe(100);
    expect(calculateNewWaterLevel(5, -10, 0, 100)).toBe(0);
  });

  it('simulates flow rate within reasonable bounds', () => {
    const result = simulateFlowRate(50, 2);
    expect(result).toBeGreaterThanOrEqual(48);
    expect(result).toBeLessThanOrEqual(52);
  });
});
