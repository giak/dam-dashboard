<template>
  <div class="water-system-dashboard">
    <h1 class="text-3xl font-bold mb-6">Tableau de bord du système d'eau</h1>
    <DamComponent v-if="damState" :damState="damState" />
  </div>
</template>

<script setup lang="ts">
import DamComponent from '@components/dam/DamComponent.vue';
import { useWaterSystem } from '@composables/useWaterSystem';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import { Subscription } from 'rxjs';
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * @description damState is a ref that holds the dam state.
 * @type {Ref<DamInterface | null>}
 */ 
const damState = ref<DamInterface | null>(null);

/**
 * @description { initializeDam, systemState$, cleanup, error$ } is an object that contains the initializeDam function, the systemState$ observable, the cleanup function, and the error$ observable.
 * @type {Object}
 */
const { initializeDam, systemState$, cleanup, error$ } = useWaterSystem();

/**
 * @description systemStateSubscription is a subscription to the systemState$ observable.
 * @type {Subscription}
 */
let systemStateSubscription: Subscription | null = null;

/**
 * @description errorSubscription is a subscription to the error$ observable.
 * @type {Subscription}
 */
let errorSubscription: Subscription | null = null;

/**
 * @description onMounted is a lifecycle hook that is called when the component is mounted.
 * @returns {void}
 */
onMounted(() => {
  /**
   * @description loggingService.info is a logging service that logs information about the initialization of the water system dashboard.
   * @param {string} message - The message to log.
   * @param {string} category - The category of the log.
   */
  loggingService.info('Initialisation du tableau de bord du système d\'eau', 'WaterSystemDashboard');

  /**
   * @description initialDamData is the initial state of the dam.
   * @type {DamInterface}
   */
  const initialDamData: DamInterface = {
    id: crypto.randomUUID(),
    name: "Barrage principal",
    currentWaterLevel: 50,
    maxWaterLevel: 100,
    minWaterLevel: 0,
    outflowRate: 25,
    inflowRate: 30,
    lastUpdated: new Date(),
    maxCapacity: 100 // Ajout de la propriété manquante
  };

  /**
   * @description initializeDam is a function that initializes the dam instance.
   * @param {DamInterface} damData - The initial state of the dam.
   * @returns {void}
   */
  initializeDam(initialDamData);

  /**
   * @description systemStateSubscription is a subscription to the systemState$ observable.
   * @type {Subscription}
   */
  systemStateSubscription = systemState$.subscribe({
    next: (state) => {
      damState.value = state;
      /**
       * @description loggingService.info is a logging service that logs information about the updated system state.
       * @param {string} message - The message to log.
       * @param {string} category - The category of the log.
       * @param {object} data - The data to log.
       */
      loggingService.info('État du système mis à jour', 'WaterSystemDashboard', { state });
    },
    error: (err) => {
      /**
       * @description loggingService.error is a logging service that logs errors about the system state subscription.
       * @param {string} message - The message to log.
       * @param {string} category - The category of the log.
       * @param {object} data - The data to log.
       */
      loggingService.error('Erreur dans la souscription systemState$', 'WaterSystemDashboard', { error: err });
    }
  });

  /**
   * @description errorSubscription is a subscription to the error$ observable.
   * @type {Subscription}
   */
  if (error$) {
    errorSubscription = error$.subscribe((error) => {
      if (error) {
        /**
         * @description loggingService.error is a logging service that logs errors about the system.
         * @param {string} message - The message to log.
         * @param {string} category - The category of the log.
         * @param {object} data - The data to log.
         */
        loggingService.error('Erreur du système d\'eau', 'WaterSystemDashboard', { error });
      }
    });
  } else {
    loggingService.warn('Observable error$ non disponible', 'WaterSystemDashboard');
  }
});

/**
 * @description onUnmounted is a lifecycle hook that is called when the component is unmounted.
 * @returns {void}
 */
onUnmounted(() => {
  /**
   * @description loggingService.info is a logging service that logs information about the cleanup of the water system dashboard.
   * @param {string} message - The message to log.
   * @param {string} category - The category of the log.
   */
  loggingService.info('Nettoyage du tableau de bord du système d\'eau', 'WaterSystemDashboard');
  if (systemStateSubscription) {
    systemStateSubscription.unsubscribe();
  }
  if (errorSubscription) {
    errorSubscription.unsubscribe();
  }
  /**
   * @description cleanup is a function that unsubscribes from the dam instance and completes the dam$ observable.
   * @returns {void}
   */
  cleanup();
});
</script>
