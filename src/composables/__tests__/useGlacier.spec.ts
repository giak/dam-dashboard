import type { GlacierStateInterface } from '@type/glacier/GlacierInterface';
import { BehaviorSubject, firstValueFrom, interval } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { map, withLatestFrom } from 'rxjs/operators';

// Définir les mocks avant les imports
const mockLoggingService = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockErrorHandlingService = {
  emitError: vi.fn(),
};

const mockGlacierUtils = {
  updateGlacierState: vi.fn((currentState, temperatureCelsius, timeInterval) => ({
    ...currentState,
    volume: currentState.volume - (0.1 * timeInterval),
    meltRate: currentState.meltRate + (0.01 * temperatureCelsius),
    outflowRate: currentState.outflowRate + (0.05 * temperatureCelsius),
    lastUpdated: new Date(),
  })),
  validateGlacierUpdate: vi.fn(),
  GlacierValidationError: class GlacierValidationError extends Error {},
};

const mockGlacierSimulation = {
  createGlacierSimulation: vi.fn((initialState, temperature$) => {
    const glacierState$ = new BehaviorSubject(initialState);
    const simulation$ = interval(100).pipe(
      withLatestFrom(temperature$),
      map(([, temperature]) => temperature)
    );
    const updateState = (temperatureCelsius: number) => {
      const currentState = glacierState$.getValue();
      const newState = mockGlacierUtils.updateGlacierState(currentState, temperatureCelsius, 0.1);
      glacierState$.next(newState);
    };
    return { glacierState$, simulation$, updateState };
  })
};

// Utiliser vi.doMock au lieu de vi.mock
vi.doMock('@/services/loggingService', () => ({ loggingService: mockLoggingService }));
vi.doMock('@/services/errorHandlingService', () => ({ errorHandlingService: mockErrorHandlingService }));
vi.doMock('@utils/glacier/glacierUtils', () => mockGlacierUtils);
vi.doMock('@services/glacierSimulation', () => mockGlacierSimulation);

// Importer useGlacier après les mocks
const { useGlacier } = await import('../glacier/useGlacier');

describe('useGlacier', () => {
  let initialData: GlacierStateInterface;
  let temperature$: BehaviorSubject<number>;

  beforeEach(() => {
    initialData = {
      id: 'glacier1',
      name: 'Test Glacier',
      volume: 1000000,
      meltRate: 0.1,
      outflowRate: 5,
      lastUpdated: new Date(),
      elevation: 3000,
      area: 50000,
      temperature: -5,
      flow: 10
    };
    temperature$ = new BehaviorSubject<number>(0);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with the correct initial state', async () => {
    const { glacierState } = useGlacier(initialData, temperature$);
    expect(glacierState.value).toEqual(initialData);
  });

  it('should update glacier state when temperature changes', async () => {
    const { glacierState, startSimulation } = useGlacier(initialData, temperature$);
    const stopSimulation = startSimulation();
    
    temperature$.next(5);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
    
    stopSimulation();
    
    expect(glacierState.value.volume).toBeLessThan(initialData.volume);
    expect(glacierState.value.meltRate).toBeGreaterThan(initialData.meltRate);
    expect(glacierState.value.outflowRate).toBeGreaterThan(initialData.outflowRate);
  });

  it('should emit updated outflow rate', async () => {
    const { outflowRate$, startSimulation } = useGlacier(initialData, temperature$);
    const stopSimulation = startSimulation();
    
    temperature$.next(10);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newOutflowRate = await firstValueFrom(outflowRate$);
    expect(newOutflowRate).toBeGreaterThan(initialData.outflowRate);
    
    stopSimulation();
  });

  it('should handle errors during glacier update', () => {
    const { updateGlacier } = useGlacier(initialData, temperature$);
    mockGlacierUtils.validateGlacierUpdate.mockImplementationOnce(() => {
      throw new mockGlacierUtils.GlacierValidationError("Invalid update");
    });
    
    expect(() => updateGlacier({ volume: -1 })).toThrow(mockGlacierUtils.GlacierValidationError);
    expect(mockErrorHandlingService.emitError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'GLACIER_UPDATE_ERROR'
    }));
  });

  it('should clean up resources', () => {
    const { cleanup } = useGlacier(initialData, temperature$);
    cleanup();
    expect(mockLoggingService.info).toHaveBeenCalledWith('Glacier resources cleaned up', 'useGlacier', expect.any(Object));
  });
});
