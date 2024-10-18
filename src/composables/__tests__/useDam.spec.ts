import { useDam } from "@composables/dam/useDam";
import { browserConfig } from "@config/browserEnv";
import type { DamInterface } from "@type/dam/DamInterface";
import { map, of, take } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the browserConfig
vi.mock("@config/browserEnv", () => ({
  browserConfig: {
    updateInterval: 1000,
    damSurfaceArea: 1000000,
    maxFlowRateChange: 10,
  },
}));

// Mock the errorHandlingService
vi.mock("@services/errorHandlingService", () => ({
  errorHandlingService: {
    getErrorObservable: vi.fn(() => of(null)),
    emitError: vi.fn(),
  },
}));

vi.mock('@services/loggingService', () => ({
  loggingService: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Update the inflow aggregator mock to return an observable that completes after emitting once
vi.mock('@services/inflowAggregator', () => ({
  createInflowAggregator: vi.fn(() => of({ totalInflow: 150 }).pipe(take(1))),
}));

describe("useDam", () => {
  let initialData: DamInterface;
  let dam: ReturnType<typeof useDam>;

  beforeEach(() => {
    initialData = {
      id: "dam1",
      name: "Test Dam",
      currentWaterLevel: 50,
      minWaterLevel: 0,
      maxWaterLevel: 100,
      maxCapacity: 1000000, // Add the missing maxCapacity property
      inflowRate: 100,
      outflowRate: 80,
      lastUpdated: new Date(),
    };
    // Provide an empty array as inflowSources
    dam = useDam(initialData, []);
  });

  afterEach(() => {
    if (dam && typeof dam.cleanup === 'function') {
      dam.cleanup();
    }
  });

  it("should initialize with the correct initial state", async () => {
    const state = await new Promise<DamInterface>((resolve) => {
      dam.damState$.subscribe(resolve);
    });
    expect(state).toEqual(initialData);
  });

  it("should emit the correct current water level", async () => {
    const level = await new Promise<number>((resolve) => {
      dam.currentWaterLevel$.subscribe(resolve);
    });
    expect(level).toBe(initialData.currentWaterLevel);
  });

  it("should emit the correct outflow rate", async () => {
    const rate = await new Promise<number>((resolve) => {
      dam.outflowRate$.subscribe(resolve);
    });
    expect(rate).toBe(initialData.outflowRate);
  });

  it("should emit the correct inflow rate", async () => {
    const rate = await new Promise<number>((resolve) => {
      dam.damState$.subscribe(state => resolve(state.inflowRate));
    });
    expect(rate).toBe(initialData.inflowRate);
  });

  it("should update the dam state correctly", async () => {
    const update = { currentWaterLevel: 60, outflowRate: 90 };
    dam.updateDam(update);

    const state = await new Promise<DamInterface>((resolve) => {
      dam.damState$.subscribe(resolve);
    });
    expect(state.currentWaterLevel).toBe(update.currentWaterLevel);
    expect(state.outflowRate).toBe(update.outflowRate);
    expect(state.lastUpdated).toBeInstanceOf(Date);
  });

  it("should start and stop simulation correctly", async () => {
    vi.useFakeTimers();
    const stopSimulation = dam.startSimulation();
    
    let simulationRunCount = 0;
    const maxSimulationRuns = 5;
    
    const finalState = await new Promise<DamInterface>((resolve, reject) => {
      const subscription = dam.damState$.pipe(
        map(state => ({ ...state }))
      ).subscribe({
        next: (state) => {
          simulationRunCount++;
          console.log(`Simulation run ${simulationRunCount}:`, state);
          
          if (simulationRunCount >= maxSimulationRuns) {
            subscription.unsubscribe();
            resolve(state);
          }
        },
        error: (err) => {
          console.error("Error in simulation:", err);
          reject(err);
        }
      });

      // Advance time by several intervals
      for (let i = 0; i < maxSimulationRuns; i++) {
        vi.advanceTimersByTime(browserConfig.updateInterval);
      }
    });

    stopSimulation();
    vi.useRealTimers();

    expect(simulationRunCount).toBe(maxSimulationRuns);
    expect(finalState.currentWaterLevel).not.toBe(initialData.currentWaterLevel);
    expect(finalState.inflowRate).toBe(150); // This should match the mocked totalInflow
    expect(finalState.outflowRate).not.toBe(initialData.outflowRate);
  }, 10000);

  it("should throw an error when updating dam state with invalid data", () => {
    const errorUpdate = { currentWaterLevel: NaN };
    expect(() => dam.updateDam(errorUpdate)).toThrow("Invalid water level update");

    // Verify that the state hasn't changed
    dam.damState$.subscribe(state => {
      expect(state.currentWaterLevel).toBe(initialData.currentWaterLevel);
    });
  });

  it("should not emit duplicate values for water level", async () => {
    const emittedValues: number[] = [];
    const promise = new Promise<void>((resolve, reject) => {
      const subscription = dam.currentWaterLevel$.subscribe({
        next: (level) => {
          emittedValues.push(level);
          if (emittedValues.length === 2) {
            subscription.unsubscribe();
            resolve();
          }
        },
        error: reject,
      });
    });

    dam.updateDam({ currentWaterLevel: 50 }); // Same as initial
    dam.updateDam({ currentWaterLevel: 60 }); // New value
    dam.updateDam({ currentWaterLevel: 60 }); // Duplicate

    await promise;

    expect(emittedValues).toEqual([50, 60]);
  });
});
