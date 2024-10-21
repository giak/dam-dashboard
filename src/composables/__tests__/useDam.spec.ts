import type { AggregatedInflowInterface } from '@services/inflowAggregator';
import type { DamInterface } from "@type/dam/DamInterface";
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Définir les mocks avant les imports
const mockLoggingService = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockBrowserConfig = {
  updateInterval: 1000,
  damSurfaceArea: 1000000,
  maxFlowRateChange: 10,
};

const mockDamUtils = {
  updateDamState: vi.fn((state, interval, inflow) => ({
    ...state,
    currentWaterLevel: state.currentWaterLevel + 0.1,
    inflowRate: inflow,
    outflowRate: state.outflowRate + 0.1,
  })),
  validateDamUpdate: vi.fn(),
  DamValidationError: class DamValidationError extends Error {},
};

// Utiliser vi.doMock au lieu de vi.mock
vi.doMock("@config/browserEnv", () => ({ browserConfig: mockBrowserConfig }));
vi.doMock("@services/loggingService", () => ({ loggingService: mockLoggingService }));
vi.doMock("@utils/dam/damUtils", () => mockDamUtils);

// Importer useDam après les mocks
const { useDam } = await import("@composables/dam/useDam");

describe("useDam", () => {
  let initialData: DamInterface;
  let aggregatedInflow$: BehaviorSubject<AggregatedInflowInterface>;

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
    aggregatedInflow$ = new BehaviorSubject<AggregatedInflowInterface>({
      totalInflow: 100,
      sources: { 'TestSource': 100 }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with the correct initial state", async () => {
    const { damState$ } = useDam(initialData, aggregatedInflow$);
    const state = await firstValueFrom(damState$);
    expect(state).toEqual(initialData);
  });

  it("should update dam state correctly", async () => {
    const { updateDam, damState$ } = useDam(initialData, aggregatedInflow$);
    const update = { currentWaterLevel: 60, outflowRate: 90 };
    updateDam(update);
    const state = await firstValueFrom(damState$);
    expect(state.currentWaterLevel).toBe(update.currentWaterLevel);
    expect(state.outflowRate).toBe(update.outflowRate);
    expect(state.lastUpdated).toBeInstanceOf(Date);
  });

  it("should throw an error when updating with invalid data", () => {
    const { updateDam } = useDam(initialData, aggregatedInflow$);
    mockDamUtils.validateDamUpdate.mockImplementationOnce(() => {
      throw new mockDamUtils.DamValidationError("Invalid update");
    });
    expect(() => updateDam({ currentWaterLevel: NaN })).toThrow(mockDamUtils.DamValidationError);
  });

  it("should simulate dam state changes", async () => {
    const { damState$, startSimulation } = useDam(initialData, aggregatedInflow$);
    const stopSimulation = startSimulation();
    
    // Simulate time passing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    stopSimulation();
    
    const finalState = await firstValueFrom(damState$);
    expect(finalState.currentWaterLevel).toBeGreaterThan(initialData.currentWaterLevel);
    expect(finalState.outflowRate).toBeGreaterThan(initialData.outflowRate);
  });

  it("should clean up resources", async () => {
    const { cleanup, damState$ } = useDam(initialData, aggregatedInflow$);
    cleanup();
    await expect(firstValueFrom(damState$)).rejects.toThrow();
  });
});
