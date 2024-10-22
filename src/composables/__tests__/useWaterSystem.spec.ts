import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@type/glacier/GlacierInterface';
import type { RiverStateInterface } from '@type/river/RiverInterface';
import type { MainWeatherStationInterface } from '@type/weather/WeatherStationInterface';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
const mockDamState$ = new BehaviorSubject({} as DamInterface);
const mockUseDam = vi.fn(() => ({
  damState$: mockDamState$,
  currentWaterLevel$: new BehaviorSubject(0),
  outflowRate$: new BehaviorSubject(0),
  updateDam: vi.fn(),
  startSimulation: vi.fn(() => vi.fn()),
  cleanup: vi.fn(),
  _simulateStep: vi.fn(),
}));

const mockGlacierState$ = new BehaviorSubject({} as GlacierStateInterface);
const mockUseGlacier = vi.fn(() => ({
  glacierState$: mockGlacierState$,
  outflowRate$: new BehaviorSubject(0),
  startSimulation: vi.fn(() => vi.fn()),
  updateGlacier: vi.fn(),
  cleanup: vi.fn(),
  _updateGlacierState: vi.fn(),
}));

const mockRiverState$ = new BehaviorSubject({} as RiverStateInterface);
const mockUseRiver = vi.fn(() => ({
  riverState$: mockRiverState$,
  outflowRate$: new BehaviorSubject(0),
  startSimulation: vi.fn(() => vi.fn()),
  updateRiver: vi.fn(),
  cleanup: vi.fn(),
  _updateRiverState: vi.fn(),
}));

const mockUseMainWeatherStation = vi.fn(() => ({
  temperature$: new BehaviorSubject(0),
  precipitation$: new BehaviorSubject(0),
  subStations: [],
  cleanup: vi.fn()
}));

const mockCreateInflowAggregator = vi.fn();
const mockLoggingService = { info: vi.fn(), error: vi.fn() };
const mockErrorHandlingService = { emitError: vi.fn() };

vi.mock('@composables/dam/useDam', () => ({ useDam: mockUseDam }));
vi.mock('@composables/glacier/useGlacier', () => ({ useGlacier: mockUseGlacier }));
vi.mock('@composables/river/useRiver', () => ({ useRiver: mockUseRiver }));
vi.mock('@composables/weather/useMainWeatherStation', () => ({ useMainWeatherStation: mockUseMainWeatherStation }));
vi.mock('@services/inflowAggregator', () => ({ createInflowAggregator: mockCreateInflowAggregator }));
vi.mock('@services/loggingService', () => ({ loggingService: mockLoggingService }));
vi.mock('@services/errorHandlingService', () => ({ errorHandlingService: mockErrorHandlingService }));

// Import useWaterSystem after mocks
const { useWaterSystem } = await import('../useWaterSystem');

describe('useWaterSystem', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCreateInflowAggregator.mockReturnValue({
      addSource: vi.fn(),
      removeSource: vi.fn(),
      aggregatedInflow$: new BehaviorSubject({ totalInflow: 0, sources: {} }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize all components correctly', () => {
    const waterSystem = useWaterSystem();
    
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
    expect(mockDamState$.getValue()).toEqual(damData);

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
    expect(mockGlacierState$.getValue()).toEqual(glacierData);

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
    expect(mockRiverState$.getValue()).toEqual(riverData);

    const weatherStationData: MainWeatherStationInterface = {
      id: 'weather1',
      name: 'Test Weather Station',
      subStations: [],
      averageTemperature: 20,
      totalPrecipitation: 50,
      lastUpdate: new Date(),
      temperature$: new BehaviorSubject(20),
      precipitation$: new BehaviorSubject(50),
    };
    waterSystem.initializeMainWeatherStation(weatherStationData.id, weatherStationData.name, []);
    expect(mockUseMainWeatherStation).toHaveBeenCalledWith(weatherStationData.id, weatherStationData.name, []);
  });

  it('should handle errors correctly', () => {
    const waterSystem = useWaterSystem();
    mockUseDam.mockImplementation(() => {
      throw new Error('Dam initialization error');
    });

    expect(() => waterSystem.initializeDam({} as DamInterface)).toThrow('Dam initialization error');
    expect(mockErrorHandlingService.emitError).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Dam initialization error'),
      code: 'DAM_INIT_ERROR',
    }));
  });

  it('should clean up resources correctly', () => {
    const mockCleanup = vi.fn();
    
    mockUseDam.mockReturnValue({
      ...mockUseDam(),
      cleanup: mockCleanup
    });
    
    mockUseGlacier.mockReturnValue({
      ...mockUseGlacier(),
      cleanup: mockCleanup
    });
    
    mockUseRiver.mockReturnValue({
      ...mockUseRiver(),
      cleanup: mockCleanup
    });
    
    mockUseMainWeatherStation.mockReturnValue({
      ...mockUseMainWeatherStation(),
      cleanup: mockCleanup,
      subStations: [{ cleanup: mockCleanup }]
    });

    const waterSystem = useWaterSystem();
    waterSystem.initializeDam({} as DamInterface);
    waterSystem.initializeGlacier({} as GlacierStateInterface);
    waterSystem.initializeRiver({} as RiverStateInterface);
    waterSystem.initializeMainWeatherStation('id', 'name', []);

    waterSystem.cleanup();

    expect(mockCleanup).toHaveBeenCalledTimes(4);
    expect(mockLoggingService.info).toHaveBeenCalledWith('Water system cleaned up', 'useWaterSystem.cleanup');
  });
});
