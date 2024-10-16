import { browserConfig } from '@config/browserEnv';
import type { DamInterface } from '@type/dam/DamInterface';
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDam } from '../dam/useDam';

describe('useDam', () => {
  let initialDamData: DamInterface;

  // Configuration initiale avant chaque test
  beforeEach(() => {
    // Utilisation de faux timers pour contrôler le temps dans les tests
    vi.useFakeTimers();
    // Définition des données initiales du barrage pour les tests
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

  // Nettoyage après chaque test
  afterEach(() => {
    // Restauration des vrais timers après chaque test
    vi.useRealTimers();
  });

  // Test d'initialisation correcte
  it('devrait s\'initialiser avec les données initiales correctes', async () => {
    // Initialisation du composable avec les données initiales  
    const { damState$ } = useDam(initialDamData);
    // Attente de la réception de la valeur initiale
    const state = await firstValueFrom(damState$);
    // Vérification que la valeur initiale est égale aux données initiales
    expect(state).toEqual(initialDamData);
  });

  // Test de mise à jour du niveau d'eau au fil du temps
  it('devrait mettre à jour le niveau d\'eau au fil du temps', async () => {
    // Initialisation du composable avec les données initiales
    const { currentWaterLevel$, startSimulation, cleanup } = useDam(initialDamData);
    // Démarrage de la simulation
    const stopSimulation = startSimulation();
    
    // Capture des 3 premières valeurs émises
    const levelsPromise = firstValueFrom(currentWaterLevel$.pipe(take(3), toArray()));
    
    // Avance le temps de 2 secondes
    vi.advanceTimersByTime(2000);
    
    const levels = await levelsPromise;
    expect(levels.length).toBe(3);
    expect(levels[0]).toBe(50);  // Niveau initial
    expect(levels[1]).not.toBe(50);  // Le niveau a changé
    expect(levels[2]).not.toBe(levels[1]);  // Le niveau continue de changer
    
    stopSimulation();
    cleanup();
  });

  // Test de mise à jour correcte des propriétés du barrage
  it('devrait mettre à jour correctement les propriétés du barrage', async () => {
    // Initialisation du composable avec les données initiales
    const { damState$, updateDam } = useDam(initialDamData);
    
    // Mise à jour du niveau d'eau
    updateDam({ currentWaterLevel: 60 });
    
    // Attente de la réception de la valeur mise à jour
    const updatedState = await firstValueFrom(damState$);
    // Vérification que la valeur mise à jour est égale à 60
    expect(updatedState.currentWaterLevel).toBe(60);
  });

  // Test de complétion des observables lors du nettoyage
  it('devrait compléter les observables lors du nettoyage', async () => {
    // Initialisation du composable avec les données initiales
    const { damState$, cleanup } = useDam(initialDamData);
    // Attente de la complétion de l'observable
    const completionPromise = new Promise<void>(resolve => {
      damState$.subscribe({
        complete: () => resolve()
      });
    });
    
    cleanup();
    
    await expect(completionPromise).resolves.toBeUndefined();
  });

  // Test de gestion des niveaux d'eau extrêmes
  it('devrait gérer les niveaux d\'eau extrêmes', async () => {
    // Utilisation de faux timers pour contrôler le temps dans les tests
    vi.useFakeTimers();
    // Création d'un jeu de données avec un niveau d'eau maximum
    const extremeData: DamInterface = {
      ...initialDamData,
      currentWaterLevel: 100,  // Niveau maximum
      inflowRate: 50,
      outflowRate: 10
    };
    // Initialisation du composable avec les données initiales
    const { currentWaterLevel$, cleanup } = useDam(extremeData);
    // Attente de la réception de la valeur initiale
    const getNextLevel = () => firstValueFrom(currentWaterLevel$.pipe(take(1)));
    
    const level1 = await getNextLevel();
    expect(level1).toBe(100);
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level2 = await getNextLevel();
    expect(level2).toBeCloseTo(100, 0);  // Permet une petite variation
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level3 = await getNextLevel();
    expect(level3).toBeCloseTo(100, 0);  // Permet une petite variation
    
    cleanup();
    vi.useRealTimers();
  });

  // Test de gestion des débits d'entrée et de sortie nuls
  it('devrait gérer les débits d\'entrée et de sortie nuls', async () => {
    // Utilisation de faux timers pour contrôler le temps dans les tests
    vi.useFakeTimers();
    // Création d'un jeu de données avec des débits d'entrée et de sortie nuls
    const zeroFlowData: DamInterface = {
      ...initialDamData,
      inflowRate: 0,
      outflowRate: 0
    };
    // Initialisation du composable avec les données initiales
    const { currentWaterLevel$, cleanup } = useDam(zeroFlowData);
    // Attente de la réception de la valeur initiale
    const getNextLevel = () => firstValueFrom(currentWaterLevel$.pipe(take(1)));
    
    const level1 = await getNextLevel();
    expect(level1).toBe(50);
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level2 = await getNextLevel();
    expect(level2).toBeCloseTo(50, 4);  // Permet une très petite variation
    
    vi.advanceTimersByTime(browserConfig.updateInterval);
    const level3 = await getNextLevel();
    expect(level3).toBeCloseTo(50, 4);  // Permet une très petite variation
    
    cleanup();
    vi.useRealTimers();
  });

  // Test d'émission des mises à jour à l'intervalle correct
  it('devrait émettre des mises à jour à l\'intervalle correct', async () => {
    // Utilisation de faux timers pour contrôler le temps dans les tests
    vi.useFakeTimers();
    // Initialisation du composable avec les données initiales
    const { currentWaterLevel$, startSimulation, cleanup } = useDam(initialDamData);
    
    // Attente de la réception de la valeur initiale
    const updatePromise = new Promise<number[]>(resolve => {
      const levels: number[] = [];
      const subscription = currentWaterLevel$.subscribe({
        next: (level) => {
          levels.push(level);
          if (levels.length === 4) {
            resolve(levels);
            subscription.unsubscribe();
          }
        }
      });
    });

    const stopSimulation = startSimulation();

    // Avance le temps de 3 intervalles
    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(browserConfig.updateInterval);
    }

    const levels = await updatePromise;

    expect(levels.length).toBe(4); // Valeur initiale + 3 mises à jour
    expect(new Set(levels).size).toBeGreaterThan(1); // Vérifie que les niveaux changent

    stopSimulation();
    cleanup();
    vi.useRealTimers();
  });
});
