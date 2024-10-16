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

  it('should handle multiple dam initializations', async () => {
    const { initializeDam, systemState$, cleanup } = useWaterSystem();
    
    const dam1: DamInterface = { ...initialDamData, id: '1', name: 'Dam 1' };
    const dam2: DamInterface = { ...initialDamData, id: '2', name: 'Dam 2' };
    
    initializeDam(dam1);
    
    const state1 = await firstValueFrom(systemState$);
    expect(state1?.name).toBe('Dam 1');
    
    initializeDam(dam2);
    
    const state2 = await firstValueFrom(systemState$);
    expect(state2?.name).toBe('Dam 2');
    
    cleanup();
  });

  it('should emit correct total water level', async () => {
    const { initializeDam, totalWaterLevel$, cleanup } = useWaterSystem();
    
    const dam: DamInterface = { ...initialDamData, currentWaterLevel: 75 };
    
    initializeDam(dam);
    
    const levelsPromise = firstValueFrom(totalWaterLevel$.pipe(take(3), toArray()));
    
    vi.advanceTimersByTime(2000);
    
    const levels = await levelsPromise;
    expect(levels[0]).toBe(75);
    expect(levels[1]).not.toBe(75);
    expect(levels[2]).not.toBe(levels[1]);
    
    cleanup();
  });
});
