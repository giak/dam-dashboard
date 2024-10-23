import type { ErrorDataInterface, ErrorHandlingService } from "@/services/errorHandlingService";
import type { LoggingService } from "@/services/loggingService";
import type { DamInterface } from "@/types/dam/DamInterface";
import type { DamServiceInterface } from "@/types/dam/DamServiceInterface";
import type { WaterSystemDependenciesInterface } from "@/types/waterSystem";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { TestScheduler } from "rxjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWaterSystem } from "../useWaterSystem";

describe("useWaterSystem", () => {
  let testScheduler: TestScheduler;
  let dependencies: WaterSystemDependenciesInterface;
  let mockCreateDamService: ReturnType<typeof vi.fn>;

  // Helper function pour créer un mock du service de barrage
  const createMockDamService = (initialData: DamInterface): DamServiceInterface => ({
    getDamState$: () => new BehaviorSubject(initialData),
    getCurrentWaterLevel$: () => new BehaviorSubject(initialData.currentWaterLevel),
    updateDam: vi.fn(),
    startSimulation: vi.fn().mockReturnValue(() => {}),
    cleanup: vi.fn()
  });

  // Mock des services
  const mockErrorHandlingService = {
    onError: vi.fn(),
    getErrorObservable: vi.fn().mockReturnValue(new Subject<ErrorDataInterface>()),
    reportError: vi.fn(),
    handleError: vi.fn(),
    dispose: vi.fn()
  } as unknown as ErrorHandlingService;

  // Mock du LoggingService aligné avec l'implémentation réelle
  const mockLoggingService = {
    logs: [],
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    printLog: vi.fn(),
    getLogs: vi.fn().mockReturnValue([]),
    errorHandlingService: mockErrorHandlingService,
    setErrorHandlingService: vi.fn(),
    subscribeToErrors: vi.fn(),
    unsubscribeFromErrors: vi.fn(),
    dispose: vi.fn()
  } as unknown as LoggingService;

  const mockInflowAggregator = {
    addSource: vi.fn(),
    aggregatedInflow$: new BehaviorSubject(0),
  };

  // Mock des services de création
  const mockCreateGlacierService = vi.fn();
  const mockCreateRiverService = vi.fn();
  const mockCreateWeatherService = vi.fn();

  beforeEach(() => {
    // Configuration du TestScheduler
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

    // Création du mock createDamService
    mockCreateDamService = vi.fn();

    // Initialisation des dépendances
    dependencies = {
      errorHandlingService: mockErrorHandlingService,
      loggingService: mockLoggingService,
      createInflowAggregator: vi.fn().mockReturnValue(mockInflowAggregator),
      createDamService: mockCreateDamService,
      createGlacierService: mockCreateGlacierService,
      createRiverService: mockCreateRiverService,
      createWeatherService: mockCreateWeatherService
    };

    // Reset des mocks avant chaque test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Nettoyage après chaque test
    mockInflowAggregator.aggregatedInflow$.complete();
  });

  it("should create waterSystem with initial state", () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const waterSystem = useWaterSystem(dependencies);

      expectObservable(waterSystem.systemState$).toBe("a", {
        a: {
          dam: null,
          glacier: null,
          river: null,
          mainWeather: null,
        },
      });

      expect(mockErrorHandlingService.getErrorObservable).toHaveBeenCalled();
    });
  });

  it("should calculate total water volume correctly", () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const waterSystem = useWaterSystem(dependencies);
      
      // Vérifier que le totalWaterVolume$ émet la valeur correcte initialement
      expectObservable(waterSystem.totalWaterVolume$).toBe("a", {
        a: 0, // La valeur initiale devrait être 0 car dam et river sont null
      });
    });
  });

  it("should handle error observable", () => {
    testScheduler.run(({ cold, expectObservable }) => {
      const waterSystem = useWaterSystem(dependencies);
      
      // Vérifier que l'observable d'erreur est correctement configuré
      expect(mockErrorHandlingService.getErrorObservable).toHaveBeenCalled();
      
      // Vérifier que l'observable d'erreur est disponible
      expect(waterSystem.error$).toBeDefined();
    });
  });

  describe("Dam initialization", () => {
    it("should initialize dam correctly", () => {
      // Préparation des données de test
      const mockDamData: DamInterface = {
        id: "dam1",
        name: "Test Dam",
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0,
        outflowRate: 10,
        inflowRate: 15,
        maxCapacity: 1000,
        lastUpdated: new Date()
      };

      // Mock du service de barrage avec l'interface complète
      const mockDamService: DamServiceInterface = {
        getDamState$: () => new BehaviorSubject(mockDamData),
        getCurrentWaterLevel$: () => new BehaviorSubject(mockDamData.currentWaterLevel),
        updateDam: vi.fn(),
        startSimulation: vi.fn().mockReturnValue(() => {}),
        cleanup: vi.fn()
      };

      // Configuration du mock createDamService avant la création du système
      const mockCreateDamService = vi.fn().mockReturnValue(mockDamService);
      dependencies.createDamService = mockCreateDamService;

      // Création du système d'eau
      const waterSystem = useWaterSystem(dependencies);

      // Initialisation du barrage
      waterSystem.initializeDam(mockDamData);

      // Vérifications immédiates
      expect(mockCreateDamService).toHaveBeenCalledWith(
        mockDamData,
        expect.anything() // Pour le totalInflow$
      );

      // Vérifier que le service de logging a été appelé
      expect(dependencies.loggingService.info).toHaveBeenCalledWith(
        expect.stringContaining("Dam initialized"),
        expect.any(String)
      );

      // Vérification de l'état du système
      let currentState: any;
      waterSystem.systemState$.subscribe(state => {
        currentState = state;
      });

      expect(currentState).toEqual({
        dam: mockDamData,
        glacier: null,
        river: null,
        mainWeather: null,
      });
    });

    it("should handle dam initialization error", () => {
      const mockError = new Error("Dam initialization failed");
      
      // Configuration du mock pour lancer une erreur
      const mockCreateDamService = vi.fn().mockImplementation(() => {
        throw mockError;
      });
      dependencies.createDamService = mockCreateDamService;

      const waterSystem = useWaterSystem(dependencies);
      const mockDamData = {} as DamInterface;

      // L'initialisation devrait échouer mais ne pas planter
      waterSystem.initializeDam(mockDamData);

      // Vérifier que l'erreur a été gérée
      expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(
        mockError,
        expect.stringContaining("initializeDam")
      );

      // Vérifier l'état du système
      let currentState: any;
      waterSystem.systemState$.subscribe(state => {
        currentState = state;
      });

      expect(currentState).toEqual({
        dam: null,
        glacier: null,
        river: null,
        mainWeather: null,
      });
    });
  });
});
