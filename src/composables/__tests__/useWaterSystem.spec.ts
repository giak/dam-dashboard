import { browserConfig } from '@config/browserEnv';
import type { DamInterface } from '@type/dam/DamInterface';
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWaterSystem } from '../useWaterSystem';

/**
 * Suite de tests pour le composable useWaterSystem.
 * Ces tests vérifient le bon fonctionnement du système de gestion de l'eau,
 * y compris l'initialisation, les mises à jour, et la gestion de plusieurs barrages.
 */
describe('useWaterSystem', () => {
  let initialDamData: DamInterface;

  /**
   * Configuration initiale avant chaque test.
   * Initialise les faux timers et définit les données initiales du barrage.
   */
  beforeEach(() => {
    vi.useFakeTimers();
    initialDamData = {
      id: '1',
      name: 'Test Dam',
      currentWaterLevel: 50,
      maxWaterLevel: 100,
      minWaterLevel: 0,
      outflowRate: 25,
      inflowRate: 30,
      lastUpdated: new Date()
    };
  });

  /**
   * Nettoyage après chaque test.
   * Restaure les vrais timers pour éviter les effets de bord entre les tests.
   */
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test d'initialisation correcte du système.
   * Vérifie que le système s'initialise avec les données correctes du barrage.
   */
  it('devrait initialiser avec les données correctes', async () => {
    const { initializeDam, systemState$ } = useWaterSystem();
    
    initializeDam(initialDamData);
    
    const state = await firstValueFrom(systemState$);
    expect(state).toEqual(initialDamData);
  });

  /**
   * Test de mise à jour du niveau d'eau total.
   * Vérifie que le niveau d'eau total est mis à jour correctement au fil du temps.
   */
  it('devrait mettre à jour le niveau d\'eau total', async () => {
    const { initializeDam, totalWaterLevel$, cleanup } = useWaterSystem();
    
    initializeDam(initialDamData);

    const levels: number[] = [];
    const subscription = totalWaterLevel$.subscribe(level => levels.push(level));

    // Simule le passage du temps en avançant l'horloge de 3 intervalles
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(browserConfig.updateInterval);
    }

    subscription.unsubscribe();
    cleanup();

    // Vérifie que plusieurs niveaux ont été émis et qu'ils ont changé
    expect(levels.length).toBeGreaterThan(1);
    expect(levels[0]).toBe(50);
    expect(new Set(levels).size).toBeGreaterThan(1);
  });

  /**
   * Test de nettoyage des ressources.
   * Vérifie que la fonction de nettoyage libère correctement les ressources.
   */
  it('devrait nettoyer les ressources lors de l\'appel à cleanup', () => {
    const { initializeDam, systemState$, cleanup } = useWaterSystem();
    
    initializeDam(initialDamData);
    
    const completeSpy = vi.fn();
    const subscription = systemState$.subscribe({ complete: completeSpy });

    cleanup();

    // Vérifie que l'observable a été complété lors du nettoyage
    expect(completeSpy).toHaveBeenCalled();
    subscription.unsubscribe();
  });

  /**
   * Test de gestion de plusieurs initialisations de barrages.
   * Vérifie que le système peut gérer l'initialisation de plusieurs barrages successivement.
   */
  it('devrait gérer plusieurs initialisations de barrages', async () => {
    const { initializeDam, systemState$, cleanup } = useWaterSystem();
    
    const dam1: DamInterface = { ...initialDamData, id: '1', name: 'Dam 1' };
    const dam2: DamInterface = { ...initialDamData, id: '2', name: 'Dam 2' };
    
    initializeDam(dam1);
    
    const state1 = await firstValueFrom(systemState$);
    expect(state1?.name).toBe('Dam 1');
    
    initializeDam(dam2);
    
    const state2 = await firstValueFrom(systemState$);
    expect(state2?.name).toBe('Dam 2');
    
    cleanup();
  });

  /**
   * Test d'émission du niveau d'eau total correct.
   * Vérifie que le système émet correctement le niveau d'eau total après initialisation et au fil du temps.
   */
  it('devrait émettre le niveau d\'eau total correct', async () => {
    const { initializeDam, totalWaterLevel$, cleanup } = useWaterSystem();
    
    const dam: DamInterface = { ...initialDamData, currentWaterLevel: 75 };
    
    initializeDam(dam);

    const levels: number[] = [];
    const subscription = totalWaterLevel$.subscribe(level => levels.push(level));

    // Simule le passage du temps en avançant l'horloge de 3 intervalles
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(browserConfig.updateInterval);
    }

    subscription.unsubscribe();
    cleanup();

    // Vérifie que le niveau initial est correct et que les niveaux changent au fil du temps
    expect(levels.length).toBeGreaterThan(1);
    expect(levels[0]).toBe(75);
    expect(new Set(levels).size).toBeGreaterThan(1);
  });

  /**
   * Test de gestion des mises à jour simultanées de plusieurs barrages.
   * Vérifie que le système peut gérer correctement l'initialisation et la mise à jour de plusieurs barrages.
   */
  it('devrait gérer les mises à jour simultanées de plusieurs barrages', async () => {
    const { initializeDam, totalWaterLevel$, cleanup } = useWaterSystem();
    
    const dam1: DamInterface = { ...initialDamData, id: '1', name: 'Dam 1', currentWaterLevel: 60 };
    const dam2: DamInterface = { ...initialDamData, id: '2', name: 'Dam 2', currentWaterLevel: 40 };
    
    initializeDam(dam1);
    initializeDam(dam2);

    const levels: number[] = [];
    const subscription = totalWaterLevel$.subscribe(level => levels.push(level));

    // Simule le passage du temps en avançant l'horloge de 3 intervalles
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(browserConfig.updateInterval);
    }

    subscription.unsubscribe();
    cleanup();

    // Vérifie que le dernier barrage initialisé est pris en compte et que les niveaux changent
    expect(levels.length).toBeGreaterThan(1);
    expect(levels[0]).toBe(40); // Le dernier barrage initialisé devrait être pris en compte
    expect(new Set(levels).size).toBeGreaterThan(1);
  });
});
