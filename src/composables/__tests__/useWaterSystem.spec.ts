import { useDam } from "@composables/dam/useDam";
import { useGlacier } from "@composables/glacier/useGlacier";
import { useRiver } from "@composables/river/useRiver";
import type { GlacierStateInterface } from "@services/glacierSimulation";
import { createInflowAggregator } from "@services/inflowAggregator";
import { loggingService } from "@services/loggingService";
import type { RiverStateInterface } from "@services/riverSimulation";
import type { DamInterface } from "@type/dam/DamInterface";
import { BehaviorSubject, firstValueFrom, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWaterSystem } from "../useWaterSystem";

vi.mock("@composables/dam/useDam");
vi.mock("@composables/glacier/useGlacier");
vi.mock("@composables/river/useRiver");
vi.mock("@services/inflowAggregator");
vi.mock("@services/loggingService");

// Objets mock communs
const mockDamState: DamInterface = {
  id: "1",
  name: "Test Dam",
  currentWaterLevel: 50,
  maxWaterLevel: 100,
  minWaterLevel: 0,
  outflowRate: 25,
  inflowRate: 30,
  lastUpdated: new Date(),
  maxCapacity: 1000000,
};

const mockGlacierState: GlacierStateInterface = {
  id: "1",
  name: "Test Glacier",
  meltRate: 0.5,
  volume: 1000000,
  outflowRate: 0.5,
  lastUpdated: new Date()
};

const mockRiverState: RiverStateInterface = {
  id: "1",
  name: "Test River",
  flowRate: 20,
  lastUpdated: new Date(),
  waterVolume: 1000000
};

// Fonctions d'aide pour les mocks
function setupDamSimulation(damState = mockDamState) {
  return vi.mocked(useDam).mockReturnValue({
    damState$: new BehaviorSubject(damState),
    currentWaterLevel$: of(damState.currentWaterLevel),
    outflowRate$: of(damState.outflowRate),
    updateDam: vi.fn(),
    startSimulation: vi.fn(),
    cleanup: vi.fn(),
    _simulateStep: vi.fn(),
  });
}

function setupGlacierSimulation(glacierState = mockGlacierState) {
  return vi.mocked(useGlacier).mockReturnValue({
    glacierState$: new BehaviorSubject(glacierState),
    outflowRate$: of(glacierState.outflowRate),
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    cleanup: vi.fn()
  });
}

function setupRiverSimulation(riverState = mockRiverState) {
  return vi.mocked(useRiver).mockReturnValue({
    riverState$: new BehaviorSubject(riverState),
    outflowRate$: of(riverState.flowRate),
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    cleanup: vi.fn()
  });
}

function setupInflowAggregator() {
  return vi.mocked(createInflowAggregator).mockReturnValue({
    addSource: vi.fn(),
    removeSource: vi.fn(),
    aggregatedInflow$: of({ totalInflow: 50.5, sources: {} })
  });
}

// Fonction pour réinitialiser tous les mocks
function resetAllMocks() {
  vi.resetAllMocks();
  setupDamSimulation();
  setupGlacierSimulation();
  setupRiverSimulation();
  setupInflowAggregator();
}

describe("useWaterSystem", () => {
  beforeEach(resetAllMocks);

  it("should return the correct interface", () => {
    const waterSystem = useWaterSystem();

    expect(waterSystem).toHaveProperty("initializeDam");
    expect(waterSystem).toHaveProperty("initializeGlacier");
    expect(waterSystem).toHaveProperty("initializeRiver");
    expect(waterSystem).toHaveProperty("systemState$");
    expect(waterSystem).toHaveProperty("totalWaterLevel$");
    expect(waterSystem).toHaveProperty("cleanup");
    expect(waterSystem).toHaveProperty("error$");
  });

  describe("initialization", () => {
    it("should initialize dam correctly", async () => {
      const { initializeDam, systemState$ } = useWaterSystem();

      initializeDam(mockDamState);

      expect(useDam).toHaveBeenCalledWith(mockDamState, expect.any(Object));
      expect(vi.mocked(useDam).mock.results[0].value.startSimulation).toHaveBeenCalled();
      
      const state = await firstValueFrom(systemState$);
      expect(state.dam).toEqual(mockDamState);
      
      expect(loggingService.info).toHaveBeenCalledWith(
        "Dam simulation initialized",
        "useWaterSystem.initializeDam",
        { damId: mockDamState.id }
      );
    });

    it("should initialize glacier correctly", async () => {
      const { initializeGlacier, systemState$ } = useWaterSystem();

      initializeGlacier(mockGlacierState);

      expect(useGlacier).toHaveBeenCalledWith(mockGlacierState);
      expect(vi.mocked(useGlacier).mock.results[0].value.startSimulation).toHaveBeenCalled();
      
      const state = await firstValueFrom(systemState$);
      expect(state.glacier).toEqual(mockGlacierState);
      
      expect(loggingService.info).toHaveBeenCalledWith(
        "Glacier simulation initialized",
        "useWaterSystem.initializeGlacier",
        { glacierId: mockGlacierState.id }
      );
    });

    it("should initialize river correctly", async () => {
      const { initializeRiver, systemState$ } = useWaterSystem();

      initializeRiver(mockRiverState);

      expect(useRiver).toHaveBeenCalledWith(mockRiverState);
      expect(vi.mocked(useRiver).mock.results[0].value.startSimulation).toHaveBeenCalled();
      
      const state = await firstValueFrom(systemState$);
      expect(state.river).toEqual(mockRiverState);
      
      expect(loggingService.info).toHaveBeenCalledWith(
        "River simulation initialized",
        "useWaterSystem.initializeRiver",
        { riverId: mockRiverState.id }
      );
    });
  });

  describe("cleanup", () => {
    it("should clean up resources correctly", () => {
      const { initializeDam, initializeGlacier, initializeRiver, cleanup } = useWaterSystem();

      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);
      initializeRiver(mockRiverState);

      cleanup();

      expect(vi.mocked(useDam).mock.results[0].value.cleanup).toHaveBeenCalled();
      expect(vi.mocked(useGlacier).mock.results[0].value.cleanup).toHaveBeenCalled();
      expect(vi.mocked(useRiver).mock.results[0].value.cleanup).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalledWith("Water system cleaned up", "useWaterSystem.cleanup");
    });
  });

  describe("totalWaterLevel$", () => {
    it("should emit the correct total water level", async () => {
      const { initializeDam, totalWaterLevel$ } = useWaterSystem();

      initializeDam(mockDamState);

      const waterLevel = await firstValueFrom(totalWaterLevel$);
      expect(waterLevel).toBe(50);
    });
  });

  describe("systemState$", () => {
    it("should emit the correct system state when all components are initialized", async () => {
      const { initializeDam, initializeGlacier, initializeRiver, systemState$ } = useWaterSystem();

      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);
      initializeRiver(mockRiverState);

      const state = await firstValueFrom(systemState$);
      expect(state).toEqual({
        dam: mockDamState,
        glacier: mockGlacierState,
        river: mockRiverState
      });
    });
  });

  describe("inflow aggregation", () => {
    it("should add sources to inflow aggregator when initializing glacier and river", () => {
      const mockAddSource = vi.fn();
      const mockInflowAggregator = {
        addSource: mockAddSource,
        removeSource: vi.fn(),
        aggregatedInflow$: of({ totalInflow: 50.5, sources: {} })
      };
      vi.mocked(createInflowAggregator).mockReturnValue(mockInflowAggregator);

      const { initializeGlacier, initializeRiver } = useWaterSystem();

      initializeGlacier(mockGlacierState);
      initializeRiver(mockRiverState);

      expect(mockAddSource).toHaveBeenCalledTimes(2);
      expect(mockAddSource).toHaveBeenCalledWith({ name: 'Glacier', outflowRate$: expect.any(Object) });
      expect(mockAddSource).toHaveBeenCalledWith({ name: 'River', outflowRate$: expect.any(Object) });
    });
  });
});
