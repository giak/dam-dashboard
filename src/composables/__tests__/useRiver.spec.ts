import type { RiverStateInterface } from '@type/river/RiverInterface';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Définir les mocks avant les imports
const mockLoggingService = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockErrorHandlingService = {
  emitError: vi.fn(),
};

const mockRiverUtils = {
  updateRiverState: vi.fn((currentState, precipitationMm, timeInterval) => ({
    ...currentState,
    waterVolume: currentState.waterVolume + (precipitationMm * currentState.catchmentArea / 1000),
    flowRate: currentState.flowRate + (0.1 * precipitationMm),
    lastUpdated: new Date(),
  })),
  validateRiverUpdate: vi.fn(),
  RiverValidationError: class RiverValidationError extends Error {},
};

const mockRiverSimulation = {
  createRiverSimulation: vi.fn((initialState, precipitation$) => {
    const riverState$ = new BehaviorSubject(initialState);
    const outflowRate$ = new BehaviorSubject(initialState.flowRate);
    
    const updateState = (precipitationMm: number) => {
      const currentState = riverState$.getValue();
      const newState = mockRiverUtils.updateRiverState(
        currentState,
        precipitationMm,
        0.1 // timeInterval
      );
      riverState$.next(newState);
      outflowRate$.next(newState.flowRate);
    };

    const startSimulation = vi.fn(() => {
      const subscription = precipitation$.subscribe(updateState);
      return () => subscription.unsubscribe();
    });

    return {
      riverState$,
      outflowRate$,
      startSimulation,
      cleanup: vi.fn(),
      updateState
    };
  }),
};

// Utiliser vi.doMock au lieu de vi.mock
vi.doMock('@/services/loggingService', () => ({ loggingService: mockLoggingService }));
vi.doMock('@/services/errorHandlingService', () => ({ errorHandlingService: mockErrorHandlingService }));
vi.doMock('@utils/river/riverUtils', () => mockRiverUtils);
vi.doMock('@services/riverSimulation', () => mockRiverSimulation);

// Importer useRiver après les mocks
const { useRiver } = await import('../river/useRiver');

describe('useRiver', () => {
  let initialData: RiverStateInterface;
  let precipitation$: BehaviorSubject<number>;

  beforeEach(() => {
    initialData = {
      id: 'river1',
      name: 'Test River',
      flowRate: 100,
      waterVolume: 1000000,
      lastUpdated: new Date(),
      waterLevel: 5,
      temperature: 15,
      pollutionLevel: 0.1,
      catchmentArea: 10000
    };
    precipitation$ = new BehaviorSubject<number>(0);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with the correct initial state', () => {
    const { riverState } = useRiver(initialData, precipitation$);
    expect(riverState.value).toEqual(initialData);
  });

  it('should update river state when precipitation changes', async () => {
    const { riverState, startSimulation } = useRiver(initialData, precipitation$);
    const stopSimulation = startSimulation();
    
    precipitation$.next(10); // Augmentons la précipitation de manière significative
    await new Promise(resolve => setTimeout(resolve, 100)); // Attendons un peu
    
    stopSimulation();
    
    expect(riverState.value.waterVolume).toBeGreaterThan(initialData.waterVolume);
    expect(riverState.value.flowRate).toBeGreaterThan(initialData.flowRate);
  });

  it('should emit updated outflow rate', async () => {
    const { outflowRate$, startSimulation } = useRiver(initialData, precipitation$);
    const stopSimulation = startSimulation();
    
    precipitation$.next(10);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newOutflowRate = await firstValueFrom(outflowRate$);
    expect(newOutflowRate).toBeGreaterThan(initialData.flowRate);
    
    stopSimulation();
  });

  it('should handle errors during river update', () => {
    const { updateRiver } = useRiver(initialData, precipitation$);
    mockRiverUtils.validateRiverUpdate.mockImplementationOnce(() => {
      throw new mockRiverUtils.RiverValidationError("Invalid update");
    });
    
    expect(() => updateRiver({ flowRate: -1 })).toThrow(mockRiverUtils.RiverValidationError);
    expect(mockErrorHandlingService.emitError).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RIVER_UPDATE_ERROR'
    }));
  });

  it('should clean up resources', () => {
    const { cleanup } = useRiver(initialData, precipitation$);
    cleanup();
    expect(mockLoggingService.info).toHaveBeenCalledWith('River resources cleaned up', 'useRiver', expect.any(Object));
  });
});
