import { useGlacier } from '@composables/glacier/useGlacier';
import { createGlacierSimulation, type GlacierStateInterface, type GlacierSimulationInterface } from '@services/glacierSimulation';
import { loggingService } from '@services/loggingService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, Observable } from 'rxjs';

vi.mock('@services/glacierSimulation');
vi.mock('@services/loggingService');

describe('useGlacier', () => {
  const mockInitialState: GlacierStateInterface = {
    id: '1',
    name: 'Test Glacier',
    meltRate: 0.5,
    volume: 1000000,
    outflowRate: 0.5,
    lastUpdated: new Date()
  };

  const mockGlacierSimulation: GlacierSimulationInterface = {
    glacierState$: new BehaviorSubject<GlacierStateInterface>(mockInitialState),
    outflowRate$: new BehaviorSubject<number>(0.5),
    startSimulation: vi.fn(),
    stopSimulation: vi.fn(),
    cleanup: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createGlacierSimulation).mockReturnValue(mockGlacierSimulation);
  });

  it('should initialize with the correct initial state', () => {
    const { glacierState$, outflowRate$ } = useGlacier(mockInitialState);
    
    expect(createGlacierSimulation).toHaveBeenCalledWith(mockInitialState);
    expect(glacierState$).toBeInstanceOf(Observable);
    expect(outflowRate$).toBeInstanceOf(Observable);
  });

  it('should start the simulation when startSimulation is called', () => {
    const { startSimulation } = useGlacier(mockInitialState);
    
    startSimulation();
    
    expect(mockGlacierSimulation.startSimulation).toHaveBeenCalled();
    expect(loggingService.info).toHaveBeenCalledWith(
      'Glacier simulation started',
      'useGlacier.startSimulation',
      expect.any(Object)
    );
  });

  it('should stop the simulation when stopSimulation is called', () => {
    const { stopSimulation } = useGlacier(mockInitialState);
    
    stopSimulation();
    
    expect(mockGlacierSimulation.stopSimulation).toHaveBeenCalled();
    expect(loggingService.info).toHaveBeenCalledWith(
      'Glacier simulation stopped',
      'useGlacier.stopSimulation',
      expect.any(Object)
    );
  });

  it('should clean up resources when cleanup is called', () => {
    const { cleanup } = useGlacier(mockInitialState);
    
    cleanup();
    
    expect(mockGlacierSimulation.cleanup).toHaveBeenCalled();
    expect(loggingService.info).toHaveBeenCalledWith(
      'Glacier resources cleaned up',
      'useGlacier.cleanup',
      expect.any(Object)
    );
  });
});
