import { useDam } from "@composables/dam/useDam";
import { browserConfig } from "@config/browserEnv";
import type { AggregatedInflowInterface } from '@services/inflowAggregator';
import type { DamInterface } from "@type/dam/DamInterface";
import { BehaviorSubject, firstValueFrom, of, take } from 'rxjs';
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
      maxCapacity: 1000000,
      inflowRate: 100,
      outflowRate: 80,
      lastUpdated: new Date(),
    };
    // Créer un BehaviorSubject pour simuler l'afflux agrégé
    const mockAggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({
      totalInflow: 100,
      sources: { 'TestSource': 100 }
    });
    dam = useDam(initialData, mockAggregatedInflow$);
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
    const mockAggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({
      totalInflow: 150,
      sources: { 'TestSource': 150 }
    });
    
    const dam = useDam(initialData, mockAggregatedInflow$);
    const stopSimulation = dam.startSimulation();
    
    let simulationRunCount = 0;
    const maxSimulationRuns = 5;
    
    const simulationPromise = new Promise<void>((resolve, reject) => {
      const subscription = dam.damState$.subscribe({
        next: (state) => {
          simulationRunCount++;
          console.log(`Simulation run ${simulationRunCount}:`, state);
          
          if (simulationRunCount >= maxSimulationRuns) {
            subscription.unsubscribe();
            resolve();
          }
        },
        error: reject
      });

      // Avancer le temps jusqu'à la prochaine mise à jour programmée
      for (let i = 0; i < maxSimulationRuns; i++) {
        vi.advanceTimersToNextTimer();
      }
    });

    await simulationPromise;

    stopSimulation();
    vi.useRealTimers();

    const finalState = await firstValueFrom(dam.damState$);
    expect(simulationRunCount).toBe(maxSimulationRuns);
    expect(finalState.currentWaterLevel).not.toBe(initialData.currentWaterLevel);
    expect(finalState.inflowRate).toBe(150);
    expect(finalState.outflowRate).not.toBe(initialData.outflowRate);
  }, 15000);

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

  it('should initialize correctly with aggregated inflow', async () => {
    vi.useFakeTimers();
    const mockAggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({ 
      totalInflow: 50, 
      sources: { 'TestSource': 50 } 
    });
    
    const dam = useDam(initialData, mockAggregatedInflow$);
    const stopSimulation = dam.startSimulation();

    const states: DamInterface[] = [];
    const subscription = dam.damState$.subscribe(state => {
      states.push({ ...state });
      console.log('New state:', state);  // Log each new state
    });

    const maxIterations = 5;
    const updateInterval = browserConfig.updateInterval;

    // Simulate time passing and inflow changes
    for (let i = 0; i < maxIterations; i++) {
      const newInflow = 50 + i * 10;
      console.log(`Setting inflow to ${newInflow}`);  // Log each inflow change
      mockAggregatedInflow$.next({ totalInflow: newInflow, sources: { 'TestSource': newInflow } });
      vi.advanceTimersByTime(updateInterval);
      await vi.runOnlyPendingTimersAsync();
    }

    // Clean up
    subscription.unsubscribe();
    stopSimulation();
    vi.useRealTimers();

    // Log all states for debugging
    console.log('All states:', states);

    // Assertions
    expect(states.length).toBeGreaterThan(1);
    expect(states[states.length - 1].inflowRate).toBe(90); // Last inflow rate we set
    
    // Check if water level increased at any point
    const initialWaterLevel = initialData.currentWaterLevel;
    const maxWaterLevel = Math.max(...states.map(s => s.currentWaterLevel));
    expect(maxWaterLevel).toBeGreaterThan(initialWaterLevel);

    // Check that water level increased over time
    const waterLevels = states.map(s => s.currentWaterLevel);
    expect(waterLevels).toEqual(expect.arrayContaining([expect.any(Number)]));
    expect(Math.max(...waterLevels)).toBeGreaterThan(Math.min(...waterLevels));
  }, 15000);
});
