import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierStateInterface';
import type { RiverStateInterface } from '@type/river/RiverStateInterface';
import type { WaterSystemDependenciesInterface } from '@type/waterSystem';
import { BehaviorSubject, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaterSystem } from '../useWaterSystem';

// Import the mocked modules
import { useDam } from '@composables/dam/useDam';
import { useGlacier } from '@composables/glacier/useGlacier';
import { useRiver } from '@composables/river/useRiver';
import { useMainWeatherStation } from '@composables/weather/useMainWeatherStation';
import { ErrorHandlingService } from '@services/errorHandlingService';
import { createInflowAggregator } from '@services/inflowAggregator';
import { LoggingService } from '@services/loggingService';

// Mocks
vi.mock('@composables/dam/useDam');
vi.mock('@composables/glacier/useGlacier');
vi.mock('@composables/river/useRiver');
vi.mock('@composables/weather/useMainWeatherStation');
vi.mock('@services/inflowAggregator');
vi.mock('@services/errorHandlingService');
vi.mock('@services/loggingService');

describe('useWaterSystem', () => {
  let mockUseDam: ReturnType<typeof vi.fn>;
  let mockUseGlacier: ReturnType<typeof vi.fn>;
  let mockUseRiver: ReturnType<typeof vi.fn>;
  let mockUseMainWeatherStation: ReturnType<typeof vi.fn>;
  let mockCreateInflowAggregator: ReturnType<typeof vi.fn>;
  let mockCreateDamService: ReturnType<typeof vi.fn>;
  let mockCreateGlacierService: ReturnType<typeof vi.fn>;
  let mockCreateRiverService: ReturnType<typeof vi.fn>;
  let mockCreateWeatherService: ReturnType<typeof vi.fn>;
  let mockErrorHandlingService: ErrorHandlingService;
  let mockLoggingService: LoggingService;

  beforeEach(() => {
    vi.resetAllMocks();

    mockUseDam = vi.mocked(useDam);
    mockUseGlacier = vi.mocked(useGlacier);
    mockUseRiver = vi.mocked(useRiver);
    mockUseMainWeatherStation = vi.mocked(useMainWeatherStation);
    mockCreateInflowAggregator = vi.mocked(createInflowAggregator);

    mockCreateDamService = vi.fn();
    mockCreateGlacierService = vi.fn();
    mockCreateRiverService = vi.fn();
    mockCreateWeatherService = vi.fn();

    mockCreateInflowAggregator.mockReturnValue({
      addSource: vi.fn(),
      removeSource: vi.fn(),
      aggregatedInflow$: new BehaviorSubject({ totalInflow: 0, sources: {} }),
    });

    // Setup mock implementations for errorHandlingService and loggingService
    mockErrorHandlingService = {
      emitError: vi.fn(),
      getErrorObservable: vi.fn().mockReturnValue(new Subject().asObservable()),
    } as unknown as ErrorHandlingService;

    mockLoggingService = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
      printLog: vi.fn(),
      getLogs: vi.fn(),
      setErrorHandlingService: vi.fn(),
    } as unknown as LoggingService;

    // Simuler l'initialisation de la connexion entre les services
    mockLoggingService.setErrorHandlingService(mockErrorHandlingService);

    vi.mocked(ErrorHandlingService).mockImplementation(() => mockErrorHandlingService);
    vi.mocked(LoggingService).mockImplementation(() => mockLoggingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockDependencies = (): WaterSystemDependenciesInterface => ({
    createInflowAggregator: mockCreateInflowAggregator,
    errorHandlingService: mockErrorHandlingService,
    loggingService: mockLoggingService,
    createDamService: mockCreateDamService,
    createGlacierService: mockCreateGlacierService,
    createRiverService: mockCreateRiverService,
    createWeatherService: mockCreateWeatherService,
  });

  it('should initialize with default dependencies', () => {
    const waterSystem = useWaterSystem(createMockDependencies());

    expect(waterSystem).toBeDefined();
    expect(waterSystem.initializeDam).toBeInstanceOf(Function);
    expect(waterSystem.initializeGlacier).toBeInstanceOf(Function);
    expect(waterSystem.initializeRiver).toBeInstanceOf(Function);
    expect(waterSystem.initializeMainWeatherStation).toBeInstanceOf(Function);
    expect(waterSystem.systemState$).toBeDefined();
    expect(waterSystem.totalWaterVolume$).toBeDefined();
    expect(waterSystem.cleanup).toBeInstanceOf(Function);
    expect(waterSystem.error$).toBeDefined();
  });

  it('should initialize components correctly', () => {
    const waterSystem = useWaterSystem(createMockDependencies());

    const damData: DamInterface = {
      id: 'dam1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      minWaterLevel: 0,
      maxWaterLevel: 100,
      maxCapacity: 1000000,
      inflowRate: 100,
      outflowRate: 80,
      lastUpdated: new Date(),
    };
    waterSystem.initializeDam(damData);
    expect(mockUseDam).toHaveBeenCalledWith(damData, expect.any(Object));

    const glacierData: GlacierStateInterface = {
      id: 'glacier1',
      name: 'Test Glacier',
      volume: 1000000,
      meltRate: 0.1,
      outflowRate: 5,
      lastUpdated: new Date(),
      elevation: 3000,
      area: 50000,
      temperature: -5,
      flow: 10,
    };
    waterSystem.initializeGlacier(glacierData);
    expect(mockUseGlacier).toHaveBeenCalledWith(glacierData, expect.any(Object));

    const riverData: RiverStateInterface = {
      id: 'river1',
      name: 'Test River',
      flowRate: 100,
      waterVolume: 1000000,
      lastUpdated: new Date(),
      waterLevel: 5,
      temperature: 15,
      pollutionLevel: 0.1,
      catchmentArea: 10000,
    };
    waterSystem.initializeRiver(riverData);
    expect(mockUseRiver).toHaveBeenCalledWith(riverData, expect.any(Object));

    waterSystem.initializeMainWeatherStation('weather1', 'Test Weather Station', []);
    expect(mockUseMainWeatherStation).toHaveBeenCalledWith('weather1', 'Test Weather Station', []);
  });

  it('should create and share observables correctly', () => {
    const waterSystem = useWaterSystem(createMockDependencies());

    expect(waterSystem.systemState$).toBeDefined();
    expect(waterSystem.totalWaterVolume$).toBeDefined();
    expect(waterSystem.error$).toBeDefined();

    const subscription1 = waterSystem.systemState$.subscribe();
    const subscription2 = waterSystem.systemState$.subscribe();
    expect(subscription1).not.toBe(subscription2);
    
    subscription1.unsubscribe();
    subscription2.unsubscribe();
  });
});
