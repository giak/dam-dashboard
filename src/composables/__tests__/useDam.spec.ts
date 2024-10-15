import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DamInterface } from '../../types/dam/DamInterface';
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
});
