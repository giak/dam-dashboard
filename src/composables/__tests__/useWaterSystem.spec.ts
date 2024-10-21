import { useDam } from "@composables/dam/useDam";
import { useGlacier } from "@composables/glacier/useGlacier";
import { useRiver } from "@composables/river/useRiver";
import { useMainWeatherStation } from "@composables/weather/useMainWeatherStation";
import { createInflowAggregator } from "@services/inflowAggregator";
import { loggingService } from "@services/loggingService";
import type { DamInterface } from "@type/dam/DamInterface";
import type { GlacierStateInterface } from "@type/glacier/GlacierStateInterface";
import type { RiverStateInterface } from "@type/river/RiverStateInterface";
import type { Latitude, Longitude, MainWeatherStationInterface, WeatherStationConfig } from "@type/weather/WeatherStationInterface";
import { BehaviorSubject, firstValueFrom, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from 'vue';
import { useWaterSystem } from "../useWaterSystem";

// Mock dependencies
vi.mock("@composables/dam/useDam");
vi.mock("@composables/glacier/useGlacier");
vi.mock("@composables/river/useRiver");
vi.mock("@composables/weather/useMainWeatherStation");
vi.mock("@services/inflowAggregator");
vi.mock("@services/loggingService");

// Mock onUnmounted
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn()
  };
});

// Common mock objects
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
  lastUpdated: new Date(),
  elevation: 3000,
  area: 50000,
  temperature: -5,
  flow: 10
};

const mockRiverState: RiverStateInterface = {
  id: "1",
  name: "Test River",
  flowRate: 20,
  lastUpdated: new Date(),
  waterVolume: 1000000,
  waterLevel: 5,
  temperature: 15,
  pollutionLevel: 0.1,
  catchmentArea: 100000
};

// Helper functions for mocks
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
    glacierState: computed(() => glacierState),
    outflowRate$: of(glacierState.outflowRate),
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    cleanup: vi.fn()
  });
}

function setupRiverSimulation(riverState = mockRiverState) {
  return vi.mocked(useRiver).mockReturnValue({
    riverState: computed(() => riverState),
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

// Function to reset all mocks
function resetAllMocks() {
  vi.resetAllMocks();
  setupDamSimulation();
  setupGlacierSimulation();
  setupRiverSimulation();
  setupInflowAggregator();
}

// Updated mock object for MainWeatherStationInterface
const createMockMainWeatherStation = (): MainWeatherStationInterface => ({
  id: 'weather1',
  name: 'Main Weather Station',
  subStations: [],
  averageTemperature: computed(() => 20),
  totalPrecipitation: computed(() => 5),
  lastUpdate: computed(() => new Date()),
  temperature$: new BehaviorSubject(20),
  precipitation$: new BehaviorSubject(5)
});

describe("useWaterSystem", () => {
  beforeEach(resetAllMocks);

  it("should return the correct interface", () => {
    const waterSystem = useWaterSystem();

    expect(waterSystem).toHaveProperty("initializeDam");
    expect(waterSystem).toHaveProperty("initializeGlacier");
    expect(waterSystem).toHaveProperty("initializeRiver");
    expect(waterSystem).toHaveProperty("initializeMainWeatherStation");
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
      const mockMainWeatherStation = createMockMainWeatherStation();

      vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

      const { initializeMainWeatherStation, initializeGlacier, systemState$ } = useWaterSystem();

      initializeMainWeatherStation('weather1', 'Main Weather Station', []);
      initializeGlacier(mockGlacierState);

      expect(useGlacier).toHaveBeenCalledWith(mockGlacierState, expect.any(Object));
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
      const mockMainWeatherStation = createMockMainWeatherStation();

      vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

      const { initializeMainWeatherStation, initializeRiver, systemState$ } = useWaterSystem();

      initializeMainWeatherStation('weather1', 'Main Weather Station', []);
      initializeRiver(mockRiverState);

      expect(useRiver).toHaveBeenCalledWith(mockRiverState, expect.any(Object));
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
      const mockMainWeatherStation = createMockMainWeatherStation();

      vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

      const { initializeDam, initializeGlacier, initializeRiver, initializeMainWeatherStation, cleanup } = useWaterSystem();

      initializeMainWeatherStation('weather1', 'Main Weather Station', []);
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
      const mockMainWeatherStation = createMockMainWeatherStation();

      vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

      const { initializeDam, initializeGlacier, initializeRiver, initializeMainWeatherStation, systemState$ } = useWaterSystem();

      const mockWeatherStationConfig: WeatherStationConfig[] = [
        { id: '1', name: 'Sub 1', latitude: 45.5 as Latitude, longitude: -73.5 as Longitude, elevation: 100 },
        { id: '2', name: 'Sub 2', latitude: 46.5 as Latitude, longitude: -74.5 as Longitude, elevation: 200 }
      ];

      initializeMainWeatherStation('weather1', 'Main Weather Station', mockWeatherStationConfig);
      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);
      initializeRiver(mockRiverState);

      const state = await firstValueFrom(systemState$);

      expect(state.dam).toEqual(mockDamState);
      expect(state.glacier).toEqual(mockGlacierState);
      expect(state.river).toEqual(mockRiverState);
      expect(state.mainWeather).toBeDefined();
      expect(state.mainWeather?.id).toBe('weather1');
      expect(state.mainWeather?.name).toBe('Main Weather Station');
      expect(state.mainWeather?.subStations).toHaveLength(0);  // Since we haven't mocked the sub-stations
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

      const mockMainWeatherStation = createMockMainWeatherStation();

      vi.mocked(useMainWeatherStation).mockReturnValue(mockMainWeatherStation);

      const { initializeMainWeatherStation, initializeGlacier, initializeRiver } = useWaterSystem();

      initializeMainWeatherStation('weather1', 'Main Weather Station', []);
      initializeGlacier(mockGlacierState);
      initializeRiver(mockRiverState);

      expect(mockAddSource).toHaveBeenCalledTimes(2);
      expect(mockAddSource).toHaveBeenCalledWith({ name: 'Glacier', outflowRate$: expect.any(Object) });
      expect(mockAddSource).toHaveBeenCalledWith({ name: 'River', outflowRate$: expect.any(Object) });
    });
  });
});
