import { browserConfig } from '@config/browserEnv';
import type { DamInterface } from '@type/dam/DamInterface';
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDam } from '../dam/useDam';

describe('useDam', () => {
  let initialData: DamInterface;

  beforeEach(() => {
    vi.useFakeTimers();
    initialData = {
      id: '1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      maxWaterLevel: 100,
      minWaterLevel: 0,
      outflowRate: 25,
      inflowRate: 30,
      lastUpdated: new Date()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct initial data', async () => {
    const { damState$ } = useDam(initialData);
    
    const state = await firstValueFrom(damState$);
    expect(state).toEqual(initialData);
  });

  it('should update water level over time', async () => {
    const { currentWaterLevel$, cleanup } = useDam(initialData);
    
    const levelsPromise = firstValueFrom(currentWaterLevel$.pipe(take(3), toArray()));
    
    vi.advanceTimersByTime(2000);
    
    const levels = await levelsPromise;
    expect(levels.length).toBe(3);
    expect(levels[0]).toBe(50);
    expect(levels[1]).not.toBe(50);
    expect(levels[2]).not.toBe(levels[1]);
    
    cleanup();
  });

  it('should emit distinct values for outflow and inflow rates', async () => {
    const { outflowRate$, inflowRate$, cleanup } = useDam(initialData);
    
    const outflowPromise = firstValueFrom(outflowRate$.pipe(take(3), toArray()));
    const inflowPromise = firstValueFrom(inflowRate$.pipe(take(3), toArray()));
    
    vi.advanceTimersByTime(2000);
    
    const outflowRates = await outflowPromise;
    const inflowRates = await inflowPromise;
    
    expect(outflowRates.length).toBe(3);
    expect(inflowRates.length).toBe(3);
    expect(new Set(outflowRates).size).toBeGreaterThan(1);
    expect(new Set(inflowRates).size).toBeGreaterThan(1);
    
    cleanup();
  });

  it('should clean up resources when cleanup is called', () => {
    const { cleanup, damState$ } = useDam(initialData);
    
    const completeSpy = vi.fn();
    damState$.subscribe({ complete: completeSpy });

    cleanup();

    expect(completeSpy).toHaveBeenCalled();
  });

  it('should handle extreme water levels', async () => {
    vi.useFakeTimers();
    const extremeData: DamInterface = {
      ...initialData,
      currentWaterLevel: 100,  // Max level
      inflowRate: 50,
      outflowRate: 10
    };
    const { currentWaterLevel$, cleanup } = useDam(extremeData);
    
    const getNextLevel = () => firstValueFrom(currentWaterLevel$.pipe(take(1)));
    
    const level1 = await getNextLevel();
    expect(level1).toBe(100);
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level2 = await getNextLevel();
    expect(level2).toBeCloseTo(100, 0);  // Allow some small variation
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level3 = await getNextLevel();
    expect(level3).toBeCloseTo(100, 0);  // Allow some small variation
    
    cleanup();
    vi.useRealTimers();
  });

  it('should handle zero inflow and outflow rates', async () => {
    vi.useFakeTimers();
    const zeroFlowData: DamInterface = {
      ...initialData,
      inflowRate: 0,
      outflowRate: 0
    };
    const { currentWaterLevel$, cleanup } = useDam(zeroFlowData);
    
    const getNextLevel = () => firstValueFrom(currentWaterLevel$.pipe(take(1)));
    
    const level1 = await getNextLevel();
    expect(level1).toBe(50);
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level2 = await getNextLevel();
    expect(level2).toBeCloseTo(50, 4);  // Allow very small variation
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level3 = await getNextLevel();
    expect(level3).toBeCloseTo(50, 4);  // Allow very small variation
    
    cleanup();
    vi.useRealTimers();
  });

  it('should emit updates at the correct interval', async () => {
    const { currentWaterLevel$, cleanup } = useDam(initialData);
    const updateInterval = 1000;  // Assuming this is the interval set in browserConfig
    
    const levelsPromise = firstValueFrom(currentWaterLevel$.pipe(take(4), toArray()));
    
    vi.advanceTimersByTime(updateInterval * 3);
    
    const levels = await levelsPromise;
    expect(levels.length).toBe(4);  // Initial value + 3 updates
    
    cleanup();
  });
});
