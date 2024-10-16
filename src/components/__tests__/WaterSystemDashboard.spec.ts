import { useWaterSystem } from '@composables/useWaterSystem';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import { mount } from '@vue/test-utils';
import { BehaviorSubject, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WaterSystemDashboard from '../WaterSystemDashboard.vue';

// Mock des dépendances
vi.mock('@/composables/useWaterSystem');
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
    const mockSystemState$ = new BehaviorSubject<DamInterface>({
      id: '1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      maxWaterLevel: 100,
      minWaterLevel: 0,
      outflowRate: 25,
      inflowRate: 30,
      lastUpdated: new Date(),
      maxCapacity: 100
    });

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>()
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que le titre est correctement rendu
    expect(wrapper.find('h1').text()).toBe("Tableau de bord du système d'eau");
    // Vérifie que le composant DamComponent est présent
    expect(wrapper.findComponent({ name: 'DamComponent' }).exists()).toBe(true);
  });

  it('calls initializeDam and cleanup on mount and unmount', async () => {
    // Prépare les mocks pour initializeDam et cleanup
    const mockInitializeDam = vi.fn();
    const mockCleanup = vi.fn();

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: mockInitializeDam,
      systemState$: new BehaviorSubject<DamInterface | null>(null),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: mockCleanup,
      error$: new Subject<string | null>()
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que initializeDam a été appelé
    expect(mockInitializeDam).toHaveBeenCalledTimes(1);
    // Vérifie que le log d'initialisation a été émis
    expect(loggingService.info).toHaveBeenCalledWith('Initialisation du tableau de bord du système d\'eau', 'WaterSystemDashboard');

    // Démonte le composant
    wrapper.unmount();

    // Vérifie que cleanup a été appelé
    expect(mockCleanup).toHaveBeenCalledTimes(1);
    // Vérifie que le log de nettoyage a été émis
    expect(loggingService.info).toHaveBeenCalledWith('Nettoyage du tableau de bord du système d\'eau', 'WaterSystemDashboard');
  });

  it('updates dam state when systemState$ emits new value', async () => {
    // Prépare les données mockées pour le test
    const mockSystemState$ = new BehaviorSubject<DamInterface>({
      id: '1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      maxWaterLevel: 100,
      minWaterLevel: 0,
      outflowRate: 25,
      inflowRate: 30,
      lastUpdated: new Date(),
      maxCapacity: 100
    });

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(50),
      cleanup: vi.fn(),
      error$: new Subject<string | null>()
    });

    // Monte le composant
    const wrapper = mount(WaterSystemDashboard);

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Émet une nouvelle valeur pour systemState$
    mockSystemState$.next({
      ...mockSystemState$.getValue(),
      currentWaterLevel: 75
    });

    // Attend que le composant soit mis à jour
    await wrapper.vm.$nextTick();

    // Vérifie que le composant DamComponent a reçu la nouvelle valeur
    const damComponent = wrapper.findComponent({ name: 'DamComponent' });
    expect(damComponent.props('damState').currentWaterLevel).toBe(75);
    // Vérifie que le log de mise à jour a été émis
    expect(loggingService.info).toHaveBeenCalledWith('État du système mis à jour', 'WaterSystemDashboard', expect.any(Object));
  });

  it('handles error in systemState$ subscription', async () => {
    // Active les timers simulés
    vi.useFakeTimers();
    const mockSystemState$ = new Subject<DamInterface | null>();
    const mockError$ = new Subject<string | null>();

    // Mock le retour de useWaterSystem
    vi.mocked(useWaterSystem).mockReturnValue({
      initializeDam: vi.fn(),
      systemState$: mockSystemState$,
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$
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
      systemState$: new BehaviorSubject<DamInterface | null>(null),
      totalWaterLevel$: new BehaviorSubject(0),
      cleanup: vi.fn(),
      error$: mockError$
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
