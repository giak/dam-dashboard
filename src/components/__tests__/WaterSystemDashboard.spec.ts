import { useWaterSystem } from '@composables/useWaterSystem';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import type { RiverStateInterface } from '@services/riverSimulation';
import { mount } from '@vue/test-utils';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterSystemDashboard from '../WaterSystemDashboard.vue';

// Mock des dépendances
vi.mock('@/composables/useWaterSystem', () => ({
  useWaterSystem: vi.fn(),
}));
vi.mock('@services/loggingService');
vi.mock('vue-chartjs', () => ({
  Bar: {
    name: 'Bar',
    template: '<div>Mocked Chart Component</div>'
  }
}));

describe('WaterSystemDashboard', () => {
  beforeEach(() => {
    // Réinitialise tous les mocks avant chaque test
    vi.resetAllMocks();
  });

  it('renders correctly with initial data', async () => {
    // Prépare les données mockées pour le test
    const mockSystemState$ = new BehaviorSubject<{
      dam: DamInterface | null;
      glacier: GlacierStateInterface | null;
      river: RiverStateInterface | null;
    }>({
      dam: {
        id: '1',
        name: 'Test Dam',
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0,
        outflowRate: 25,
        inflowRate: 30,
        lastUpdated: new Date(),
        maxCapacity: 100,
      },
      glacier: {
        id: '1',
        name: 'Test Glacier',
        meltRate: 0.5,
        volume: 1000000,
        outflowRate: 0.5,
        lastUpdated: new Date(),
      },
      river: null,
    });

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>(),
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que le titre est correctement rendu
    expect(wrapper.find('h1').text()).toBe("Tableau de bord du système d'eau");
    // Vérifie que le composant DamComponent est présent
    expect(wrapper.findComponent({ name: 'DamComponent' }).exists()).toBe(true);
    // Vérifie que le composant GlacierComponent est présent
    expect(wrapper.findComponent({ name: 'GlacierComponent' }).exists()).toBe(true);
  });

  it('calls initializeDam, initializeGlacier, and cleanup on mount and unmount', async () => {
    // Prépare les mocks pour initializeDam, initializeGlacier et cleanup
    const mockInitializeDam = vi.fn();
    const mockInitializeGlacier = vi.fn();
    const mockCleanup = vi.fn();

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: mockInitializeDam,
      initializeGlacier: mockInitializeGlacier,
      initializeRiver: vi.fn(),
      systemState$: new BehaviorSubject({ dam: null, glacier: null, river: null }),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: mockCleanup,
      error$: new Subject<string | null>(),
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que initializeDam a été appelé
    expect(mockInitializeDam).toHaveBeenCalledTimes(1);
    // Vérifie que initializeGlacier a été appelé
    expect(mockInitializeGlacier).toHaveBeenCalledTimes(1);
    // Vérifie que le log d'initialisation a été émis
    expect(loggingService.info).toHaveBeenCalledWith('Initialisation du tableau de bord du système d\'eau', 'WaterSystemDashboard');

    // Démonte le composant
    wrapper.unmount();

    // Vérifie que cleanup a été appelé
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    // Vérifie que le log de nettoyage a été émis
    expect(loggingService.info).toHaveBeenCalledWith('Nettoyage du tableau de bord du système d\'eau', 'WaterSystemDashboard');
  });

  it('updates dam and glacier state when systemState$ emits new value', async () => {
    // Prépare les données mockées pour le test
    const mockSystemState$ = new BehaviorSubject<{
      dam: DamInterface | null;
      glacier: GlacierStateInterface | null;
      river: RiverStateInterface | null;
    }>({
      dam: {
        id: '1',
        name: 'Test Dam',
        currentWaterLevel: 50,
        maxWaterLevel: 100,
        minWaterLevel: 0,
        outflowRate: 25,
        inflowRate: 30,
        lastUpdated: new Date(),
        maxCapacity: 100,
      },
      glacier: {
        id: '1',
        name: 'Test Glacier',
        meltRate: 0.5,
        volume: 1000000,
        outflowRate: 0.5,
        lastUpdated: new Date(),
      },
      river: null,
    });

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>(),
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Émet une nouvelle valeur pour systemState$
    mockSystemState$.next({
      dam: { ...mockSystemState$.getValue().dam!, currentWaterLevel: 75 },
      glacier: { ...mockSystemState$.getValue().glacier!, meltRate: 0.7 },
      river: null,
    });

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que le composant DamComponent a reçu la nouvelle valeur
    const damComponent = wrapper.findComponent({ name: 'DamComponent' });
    expect(damComponent.props('damState').currentWaterLevel).toBe(75);
    // Vérifie que le composant GlacierComponent a reçu la nouvelle valeur
    const glacierComponent = wrapper.findComponent({ name: 'GlacierComponent' });
    expect(glacierComponent.props('glacierState').meltRate).toBe(0.7);
    // Vérifie que le log de mise à jour a été émis
    expect(loggingService.info).toHaveBeenCalledWith('État du système mis à jour', 'WaterSystemDashboard', expect.any(Object));
  });

  it('handles error in systemState$ subscription', async () => {
    // Active les timers simulés
    vi.useFakeTimers();
    const mockSystemState$ = new Subject<{
      dam: DamInterface | null;
      glacier: GlacierStateInterface | null;
      river: RiverStateInterface | null;
    }>();
    const mockError$ = new Subject<string | null>();

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$,
    });

    // Monte le composant
    mount(WaterSystemDashboard);

    // Exécute tous les timers en attente
    await vi.runAllTimersAsync();

    // Émet une erreur dans systemState$
    mockSystemState$.error(new Error('Test error'));

    // Vérifie que l'erreur a été correctement loggée
    expect(loggingService.error).toHaveBeenCalledWith(
      'Erreur dans la souscription systemState$',
      'WaterSystemDashboard',
      expect.objectContaining({ error: expect.any(Error) })
    );

    // Restaure les timers réels
    vi.useRealTimers();
  });

  it('handles error$ emissions', async () => {
    // Active les timers simulés
    vi.useFakeTimers();
    const mockError$ = new Subject<string | null>();

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      initializeGlacier: vi.fn(),
      initializeRiver: vi.fn(),
      systemState$: new BehaviorSubject({ dam: null, glacier: null, river: null }),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$,
    });

    // Monte le composant
    mount(WaterSystemDashboard);

    // Exécute tous les timers en attente
    await vi.runAllTimersAsync();

    // Émet une erreur via error$
    mockError$.next('Test error');

    // Vérifie que l'erreur a été correctement loggée
    expect(loggingService.error).toHaveBeenCalledWith(
      'Erreur du système d\'eau',
      'WaterSystemDashboard',
      expect.objectContaining({ error: 'Test error' })
    );

    // Restaure les timers réels
    vi.useRealTimers();
  });
});
