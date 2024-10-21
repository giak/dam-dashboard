import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlacier } from '../glacier/useGlacier';

vi.mock('@/services/loggingService', () => ({
  loggingService: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('useGlacier', () => {
  let initialData: GlacierStateInterface;
  let temperature$: BehaviorSubject<number>;

  beforeEach(() => {
    initialData = {
      id: 'glacier1',
      name: 'Test Glacier',
      volume: 1000000,
      meltRate: 0.1,
      outflowRate: 0.1,
      elevation: 1000,
      area: 1000,
      temperature: 0,
      flow: 0,
      lastUpdated: new Date()
    };
    temperature$ = new BehaviorSubject<number>(0);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct initial state', () => {
    const { glacierState } = useGlacier(initialData, temperature$);
    expect(glacierState.value).toEqual(initialData);
  });

  it('should update glacier state based on temperature', async () => {
    const { glacierState, startSimulation, stopSimulation } = useGlacier(initialData, temperature$);
    
    startSimulation();
    temperature$.next(10); // Set temperature to 10°C
    
    vi.advanceTimersByTime(1000);
    
    expect(glacierState.value.meltRate).toBeGreaterThan(initialData.meltRate);
    expect(glacierState.value.volume).toBeLessThan(initialData.volume);
    
    stopSimulation();
  });

  it('should emit updated outflow rate', () => {
    return new Promise<void>((resolve) => {
      const { outflowRate$, startSimulation, stopSimulation } = useGlacier(initialData, temperature$);
      
      let emissionCount = 0;
      outflowRate$.subscribe(rate => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(rate).toBeGreaterThan(initialData.outflowRate);
          stopSimulation();
          resolve();
        }
      });
      
      startSimulation();
      temperature$.next(20); // Set temperature to 20°C
      vi.advanceTimersByTime(1000);
    });
  });

  it('should stop simulation when cleanup is called', () => {
    const { startSimulation, cleanup } = useGlacier(initialData, temperature$);
    
    startSimulation();
    cleanup();
    
    // Add assertions to check if the simulation has stopped
    // This might involve checking internal state or mocking interval/subscription
  });
});
