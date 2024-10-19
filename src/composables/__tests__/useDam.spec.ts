import { useDam } from "@composables/dam/useDam";
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

  it("should start simulation correctly", async () => {
    const mockAggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({
      totalInflow: 100,
      sources: { 'TestSource': 100 }
    });
    
    const initialData: DamInterface = {
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

    const dam = useDam(initialData, mockAggregatedInflow$);

    const initialWaterLevel = await firstValueFrom(dam.currentWaterLevel$);
    expect(initialWaterLevel).toBe(50);

    const stopSimulation = dam.startSimulation();
    
    // Simuler le passage du temps
    await new Promise(resolve => setTimeout(resolve, 100));

    stopSimulation();

    const finalWaterLevel = await firstValueFrom(dam.currentWaterLevel$);
    expect(finalWaterLevel).toBeGreaterThan(initialWaterLevel);
    expect(finalWaterLevel).toBeLessThan(initialWaterLevel + 1); // Assurez-vous que le changement est raisonnable

    dam.cleanup();
  });

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

  it('should initialize correctly with aggregated inflow', () => {
    const mockAggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({ 
      totalInflow: 50, 
      sources: { 'TestSource': 50 } 
    });
    
    const dam = useDam(initialData, mockAggregatedInflow$);

    const states: DamInterface[] = [];
    const subscription = dam.damState$.subscribe(state => {
      states.push({ ...state });
    });

    const maxIterations = 5;

    // Simulate time passing and inflow changes
    for (let i = 0; i < maxIterations; i++) {
      const newInflow = 50 + i * 10;
      dam._simulateStep({ totalInflow: newInflow, sources: { 'TestSource': newInflow } });
    }

    // Clean up
    subscription.unsubscribe();

    // Assertions
    expect(states.length).toBe(maxIterations + 1); // Initial state + 5 updates
    expect(states[states.length - 1].inflowRate).toBe(90); // Last inflow rate we set

    // Check if water level changed
    const initialWaterLevel = initialData.currentWaterLevel;
    const finalWaterLevel = states[states.length - 1].currentWaterLevel;
    expect(finalWaterLevel).not.toBe(initialWaterLevel);

    // Check that water level changed over time
    const waterLevels = states.map(s => s.currentWaterLevel);
    expect(waterLevels).not.toEqual(Array(states.length).fill(initialWaterLevel));
  });
});
