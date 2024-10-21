import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRiver } from '../river/useRiver';

vi.mock('@/services/loggingService', () => ({
  loggingService: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('useRiver', () => {
  let initialData: RiverStateInterface;
  let precipitation$: BehaviorSubject<number>;

  beforeEach(() => {
    initialData = {
      id: 'river1',
      name: 'Test River',
      waterVolume: 1000000,
      flowRate: 10,
      catchmentArea: 1000, // km²
      lastUpdated: new Date(),
      waterLevel: 5, // meters
      temperature: 15, // Celsius
      pollutionLevel: 0.1 // Arbitrary scale from 0 to 1
    };
    precipitation$ = new BehaviorSubject<number>(0);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct initial state', () => {
    const { riverState } = useRiver(initialData, precipitation$);
    expect(riverState.value).toEqual(initialData);
  });

  it('should update river state based on precipitation', async () => {
    const { riverState, startSimulation, stopSimulation } = useRiver(initialData, precipitation$);
    
    startSimulation();
    precipitation$.next(10); // Set precipitation to 10mm
    
    vi.advanceTimersByTime(1000);
    
    expect(riverState.value.flowRate).toBeGreaterThan(initialData.flowRate);
    expect(riverState.value.waterVolume).toBeGreaterThan(initialData.waterVolume);
    
    stopSimulation();
  });

  it('should emit updated outflow rate', () => {
    return new Promise<void>((resolve) => {
      const { outflowRate$, startSimulation, stopSimulation } = useRiver(initialData, precipitation$);
      
      let emissionCount = 0;
      outflowRate$.subscribe(rate => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(rate).toBeGreaterThan(initialData.flowRate);
          stopSimulation();
          resolve();
        }
      });
      
      startSimulation();
      precipitation$.next(20); // Set precipitation to 20mm
      vi.advanceTimersByTime(1000);
    });
  });

  it('should stop simulation when cleanup is called', () => {
    const { startSimulation, cleanup } = useRiver(initialData, precipitation$);
    
    startSimulation();
    cleanup();
    
    // Add assertions to check if the simulation has stopped
    // This might involve checking internal state or mocking interval/subscription
  });
});
