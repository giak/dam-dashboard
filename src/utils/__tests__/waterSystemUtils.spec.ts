import { createServices, createStates, createTotalInflowObservable, calculateTotalWaterVolume } from '../waterSystemUtils';
import { of } from 'rxjs';

describe('waterSystemUtils', () => {
  describe('createServices', () => {
    it('should create an object with null services', () => {
      const services = createServices();
      expect(services.damService).toBeNull();
      expect(services.glacierService).toBeNull();
      expect(services.riverService).toBeNull();
      expect(services.weatherService).toBeNull();
    });
  });

  describe('createStates', () => {
    it('should create an object with BehaviorSubjects', () => {
      const states = createStates();
      expect(states.damState$.getValue()).toBeNull();
      expect(states.glacierState$.getValue()).toBeNull();
      expect(states.riverState$.getValue()).toBeNull();
      expect(states.mainWeatherState$.getValue()).toBeNull();
    });
  });

  describe('createTotalInflowObservable', () => {
    it('should map aggregatedInflow to totalInflow', (done) => {
      const mockAggregatedInflow$ = of({ totalInflow: 100 });
      const totalInflow$ = createTotalInflowObservable(mockAggregatedInflow$);
      totalInflow$.subscribe(value => {
        expect(value).toBe(100);
        done();
      });
    });
  });

  describe('calculateTotalWaterVolume', () => {
    it('should calculate total water volume correctly', () => {
      const mockDam = { currentWaterLevel: 50, maxCapacity: 1000 } as DamInterface;
      const mockRiver = { waterVolume: 5000 } as RiverStateInterface;
      const totalVolume = calculateTotalWaterVolume(mockDam, mockRiver);
      expect(totalVolume).toBe(55000);
    });

    it('should return 0 if dam or river is null', () => {
      expect(calculateTotalWaterVolume(null, null)).toBe(0);
      expect(calculateTotalWaterVolume({ currentWaterLevel: 50, maxCapacity: 1000 } as DamInterface, null)).toBe(0);
      expect(calculateTotalWaterVolume(null, { waterVolume: 5000 } as RiverStateInterface)).toBe(0);
    });
  });
});
