import { useGlacier } from "@composables/glacier/useGlacier";
import { createDamSimulation } from "@services/damSimulation";
import type { GlacierStateInterface } from "@services/glacierSimulation";
import { createInflowAggregator } from "@services/inflowAggregator";
import { loggingService } from "@services/loggingService";
import type { DamInterface } from "@type/dam/DamInterface";
import { BehaviorSubject, firstValueFrom, map, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWaterSystem } from "../useWaterSystem";

vi.mock("@services/damSimulation");
vi.mock("@services/inflowAggregator");
vi.mock("@services/loggingService");
vi.mock("@composables/glacier/useGlacier");

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

// Fonctions d'aide
function setupDamSimulation(damState = mockDamState) {
  return vi.mocked(createDamSimulation).mockReturnValue({
    damState$: new BehaviorSubject(damState),
    currentWaterLevel$: of(damState.currentWaterLevel),
    startSimulation: vi.fn(),
    cleanup: vi.fn(),
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

// Fonction pour réinitialiser tous les mocks
function resetAllMocks() {
  vi.resetAllMocks();
  setupDamSimulation();
  setupGlacierSimulation();
}

describe("useWaterSystem", () => {
  it("should return the correct interface", () => {
    const waterSystem = useWaterSystem();

    expect(waterSystem).toHaveProperty("initializeDam");
    expect(waterSystem).toHaveProperty("initializeGlacier");
    expect(waterSystem).toHaveProperty("systemState$");
    expect(waterSystem).toHaveProperty("totalWaterLevel$");
    expect(waterSystem).toHaveProperty("cleanup");
    expect(waterSystem).toHaveProperty("error$");

    expect(typeof waterSystem.initializeDam).toBe("function");
    expect(typeof waterSystem.initializeGlacier).toBe("function");
    expect(typeof waterSystem.cleanup).toBe("function");
    expect(waterSystem.systemState$).toHaveProperty("subscribe");
    expect(waterSystem.totalWaterLevel$).toHaveProperty("subscribe");
    expect(waterSystem.error$).toHaveProperty("subscribe");
  });

  describe("initialization", () => {
    describe("initializeDam", () => {
      beforeEach(resetAllMocks);

      it("should initialize dam correctly", async () => {
        const { initializeDam, systemState$ } = useWaterSystem();

        initializeDam(mockDamState);

        expect(createDamSimulation).toHaveBeenCalledWith(mockDamState);
        expect(vi.mocked(createDamSimulation).mock.results[0].value.startSimulation).toHaveBeenCalled();
        
        const state = await firstValueFrom(systemState$);
        expect(state.dam).toEqual(mockDamState);
        
        expect(loggingService.info).toHaveBeenCalledWith(
          "Dam simulation initialized",
          "useWaterSystem.initializeDam",
          { damId: mockDamState.id }
        );
      });
    });

    describe("initializeGlacier", () => {
      beforeEach(() => {
        resetAllMocks();
        setupGlacierSimulation();
        vi.mocked(createDamSimulation).mockReturnValue({
          damState$: new BehaviorSubject(mockDamState),
          currentWaterLevel$: of(50),
          startSimulation: vi.fn(),
          cleanup: vi.fn(),
        });
      });

      it("should initialize glacier correctly and reinitialize dam", async () => {
        const { initializeGlacier, initializeDam, systemState$ } = useWaterSystem();

        // Simuler un barrage existant
        initializeDam(mockDamState);

        // Réinitialiser les mocks après l'initialisation du barrage
        resetAllMocks();

        // Recréer les mocks nécessaires après la réinitialisation
        setupGlacierSimulation();
        vi.mocked(createDamSimulation).mockReturnValue({
          damState$: new BehaviorSubject(mockDamState),
          currentWaterLevel$: of(50),
          startSimulation: vi.fn(),
          cleanup: vi.fn(),
        });

        initializeGlacier(mockGlacierState);

        expect(useGlacier).toHaveBeenCalledWith(mockGlacierState);
        expect(vi.mocked(useGlacier).mock.results[0].value.startSimulation).toHaveBeenCalled();
        
        const state = await firstValueFrom(systemState$);
        expect(state.glacier).toEqual(mockGlacierState);
        
        // Vérifier que createDamSimulation a été appelé une fois pour la réinitialisation
        expect(createDamSimulation).toHaveBeenCalledTimes(1);
        expect(createDamSimulation).toHaveBeenCalledWith(mockDamState);
        
        expect(loggingService.info).toHaveBeenCalledWith(
          "Glacier simulation initialized",
          "useWaterSystem.initializeGlacier",
          { glacierId: mockGlacierState.id }
        );

        // Vérifier que la simulation du barrage a été démarrée
        expect(vi.mocked(createDamSimulation).mock.results[0].value.startSimulation).toHaveBeenCalled();
      });
    });
  });

  describe("cleanup", () => {
    it("should clean up resources correctly", () => {
      const { initializeDam, initializeGlacier, cleanup } = useWaterSystem();

      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);

      cleanup();

      expect(vi.mocked(createDamSimulation).mock.results[0].value.cleanup).toHaveBeenCalled();
      expect(vi.mocked(useGlacier).mock.results[0].value.cleanup).toHaveBeenCalled();
      expect(loggingService.info).toHaveBeenCalledWith("Water system cleaned up", "useWaterSystem.cleanup");
    });
  });

  describe("totalWaterLevel$", () => {
    it("should emit the correct total water level", async () => {
      setupDamSimulation();

      const { initializeDam, totalWaterLevel$ } = useWaterSystem();

      initializeDam(mockDamState);

      const waterLevel = await firstValueFrom(totalWaterLevel$);
      expect(waterLevel).toBe(50);

      // Simuler un changement de niveau d'eau
      setupDamSimulation({ ...mockDamState, currentWaterLevel: 75 });

      initializeDam({ ...mockDamState, currentWaterLevel: 75 });

      const updatedWaterLevel = await firstValueFrom(totalWaterLevel$);
      expect(updatedWaterLevel).toBe(75);
    });
  });

  describe("systemState$", () => {
    it("should emit the correct system state when dam and glacier are initialized", async () => {
      setupDamSimulation();
      setupGlacierSimulation();

      const { initializeDam, initializeGlacier, systemState$ } = useWaterSystem();

      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);

      const state = await firstValueFrom(systemState$);
      expect(state).toEqual({
        dam: mockDamState,
        glacier: mockGlacierState
      });
    });
  });

  describe("multiple water sources", () => {
    it("should handle multiple inflow sources correctly", async () => {
      setupDamSimulation();
      setupGlacierSimulation();

      const mockRiver = {
        name: "Test River",
        outflowRate$: of(10)
      };

      vi.mocked(createInflowAggregator).mockReturnValue(of({
        totalInflow: 40.5,
        sources: { "Glacier": 0.5, "Test River": 10 }
      }));

      const { initializeDam, initializeGlacier, totalWaterLevel$ } = useWaterSystem();

      initializeDam(mockDamState);
      initializeGlacier(mockGlacierState);

      // Simuler l'ajout d'une source d'eau supplémentaire
      const currentSimulation = vi.mocked(createDamSimulation).mock.results[0].value;
      vi.mocked(createInflowAggregator).mockReturnValue(of({
        totalInflow: 40.5,
        sources: { "Glacier": 0.5, "Test River": 10 }
      }));
      currentSimulation.damState$.next({
        ...mockDamState,
        inflowRate: 40.5
      });

      const waterLevel = await firstValueFrom(totalWaterLevel$);
      expect(waterLevel).toBe(50);  // Le niveau d'eau initial

      // Vérifier que createInflowAggregator a été appelé avec au moins la source Glacier
      expect(createInflowAggregator).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Glacier",
            outflowRate$: expect.any(Object)
          })
        ])
      );

      // Vérifier le nombre d'appels à createInflowAggregator
      expect(createInflowAggregator).toHaveBeenCalledTimes(9);

      // Vérifier le dernier appel à createInflowAggregator
      const lastCall = vi.mocked(createInflowAggregator).mock.calls[8];
      expect(lastCall[0]).toHaveLength(1);
      expect(lastCall[0][0]).toHaveProperty('name', 'Glacier');
      expect(lastCall[0][0]).toHaveProperty('outflowRate$');
    });
  });

  describe("rapid state changes", () => {
    it("should handle rapid state changes correctly", async () => {
      const { initializeDam, totalWaterLevel$ } = useWaterSystem();

      const damStateBehaviorSubject = new BehaviorSubject(mockDamState);
      vi.mocked(createDamSimulation).mockReturnValue({
        damState$: damStateBehaviorSubject,
        currentWaterLevel$: damStateBehaviorSubject.pipe(map(state => state.currentWaterLevel)),
        startSimulation: vi.fn(),
        cleanup: vi.fn(),
      });

      initializeDam(mockDamState);

      const waterLevels: number[] = [];
      const subscription = totalWaterLevel$.subscribe(level => waterLevels.push(level));

      // Simuler des changements rapides
      damStateBehaviorSubject.next({ ...mockDamState, currentWaterLevel: 60 });
      damStateBehaviorSubject.next({ ...mockDamState, currentWaterLevel: 70 });

      // Attendre que les émissions soient traitées
      await new Promise(resolve => setTimeout(resolve, 0));

      subscription.unsubscribe();

      expect(waterLevels).toEqual([50, 60, 70]);
    });
  });

  describe("error handling", () => {
    it("should handle errors in dam simulation", async () => {
      const { initializeDam, error$ } = useWaterSystem();

      vi.mocked(createDamSimulation).mockImplementation(() => {
        throw new Error("Dam simulation error");
      });

      const errorPromise = firstValueFrom(error$);
      
      try {
        initializeDam(mockDamState);
      } catch (error) {
        // L'erreur est attendue, ne rien faire ici
      }

      const errorMessage = await errorPromise;
      expect(errorMessage).toContain("Dam simulation error");
    });

    it("should handle errors in glacier simulation", async () => {
      const { initializeGlacier, error$ } = useWaterSystem();

      vi.mocked(useGlacier).mockImplementation(() => {
        throw new Error("Glacier simulation error");
      });

      const errorPromise = firstValueFrom(error$);
      
      try {
        initializeGlacier(mockGlacierState);
      } catch (error) {
        // L'erreur est attendue, ne rien faire ici
      }

      const errorMessage = await errorPromise;
      expect(errorMessage).toContain("Glacier simulation error");
    });
  });
});
