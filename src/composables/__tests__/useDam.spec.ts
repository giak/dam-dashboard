import { browserConfig } from "@config/browserEnv";
import { errorHandlingService } from "@services/errorHandlingService";
import type { DamInterface } from "@type/dam/DamInterface";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDam } from "@composables/dam/useDam";

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
    emitError: vi.fn(),
  },
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
    dam = useDam(initialData);
  });

  afterEach(() => {
    dam.cleanup();
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
      dam.inflowRate$.subscribe(resolve);
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
    const stopSimulation = dam.startSimulation();
    
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        dam.damState$.subscribe((state) => {
          expect(state.currentWaterLevel).not.toBe(initialData.currentWaterLevel);
          expect(state.inflowRate).not.toBe(initialData.inflowRate);
          expect(state.outflowRate).not.toBe(initialData.outflowRate);
          
          stopSimulation();
          resolve();
        });
      }, browserConfig.updateInterval * 2);
    });
  });

  it("should handle errors when updating dam state", () => {
    const errorUpdate = { currentWaterLevel: NaN };
    dam.updateDam(errorUpdate);

    expect(errorHandlingService.emitError).toHaveBeenCalledWith(expect.objectContaining({
      code: "WATER_LEVEL_ERROR",
      context: "useDam.updateDam", // Updated context
    }));

    // Verify that the state hasn't changed
    dam.damState$.subscribe(state => {
      expect(state.currentWaterLevel).toBe(initialData.currentWaterLevel);
    });
  });

  it("should not emit duplicate values for water level", async () => {
    const emittedValues: number[] = [];
    const subscription = dam.currentWaterLevel$.subscribe((level) => {
      emittedValues.push(level);
    });

    dam.updateDam({ currentWaterLevel: 50 }); // Same as initial
    dam.updateDam({ currentWaterLevel: 60 }); // New value
    dam.updateDam({ currentWaterLevel: 60 }); // Duplicate

    // Wait for all updates to be processed
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(emittedValues).toEqual([50, 60]);

    subscription.unsubscribe();
  });
});
