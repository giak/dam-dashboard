import type { DamInterface } from '@type/dam/DamInterface';
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaterSystem } from '../useWaterSystem';

describe('useWaterSystem', () => {
  let initialDamData: DamInterface;

  beforeEach(() => {
    vi.useFakeTimers();
    initialDamData = {
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
    const { initializeDam, systemState$ } = useWaterSystem();
    
    initializeDam(initialDamData);
    
    const state = await firstValueFrom(systemState$);
    expect(state).toEqual(initialDamData);
  });

  it('should update total water level over time', async () => {
    const { initializeDam, totalWaterLevel$ } = useWaterSystem();
    
    initializeDam(initialDamData);
    
    const levelsPromise = firstValueFrom(totalWaterLevel$.pipe(take(3), toArray()));
    
    vi.advanceTimersByTime(2000);
    
    const levels = await levelsPromise;
    expect(levels.length).toBe(3);
    expect(levels[0]).toBe(50);
    expect(levels[1]).not.toBe(50);
    expect(levels[2]).not.toBe(levels[1]);
  });

  it('should clean up resources when cleanup is called', async () => {
    const { initializeDam, systemState$, cleanup } = useWaterSystem();
    
    initializeDam(initialDamData);
    
    const completeSpy = vi.fn();
    systemState$.subscribe({ complete: completeSpy });

    cleanup();

    expect(completeSpy).toHaveBeenCalled();
  });
});