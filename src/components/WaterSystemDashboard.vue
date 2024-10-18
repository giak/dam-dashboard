<template>
  <div class="water-system-dashboard">
    <h1 class="text-3xl font-bold mb-6">Tableau de bord du système d'eau</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DamComponent v-if="damState" :damState="damState" />
      <GlacierComponent v-if="glacierState" :glacierState="glacierState" />
      <RiverComponent v-if="riverState" :riverState="riverState" />
    </div>
  </div>
</template>

<script setup lang="ts">
import DamComponent from '@components/dam/DamComponent.vue';
import GlacierComponent from '@components/glacier/GlacierComponent.vue';
import RiverComponent from '@components/river/RiverComponent.vue';
import { useWaterSystem } from '@composables/useWaterSystem';
import { loggingService } from '@services/loggingService';
import type { DamInterface } from '@type/dam/DamInterface';
import type { GlacierStateInterface } from '@services/glacierSimulation';
import type { RiverStateInterface } from '@services/riverSimulation';
import { Subscription } from 'rxjs';
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * @description damState is a ref that holds the dam state.
 * @type {Ref<DamInterface | null>}
 */ 
const damState = ref<DamInterface | null>(null);

/**
 * @description glacierState is a ref that holds the glacier state.
 * @type {Ref<GlacierStateInterface | null>}
 */
const glacierState = ref<GlacierStateInterface | null>(null);

/**
 * @description riverState is a ref that holds the river state.
 * @type {Ref<RiverStateInterface | null>}
 */
const riverState = ref<RiverStateInterface | null>(null);

/**
 * @description { initializeDam, initializeGlacier, initializeRiver, systemState$, cleanup, error$ } is an object that contains the initializeDam function, the initializeGlacier function, the initializeRiver function, the systemState$ observable, the cleanup function, and the error$ observable.
 * @type {Object}
 */
const { initializeDam, initializeGlacier, initializeRiver, systemState$, cleanup, error$ } = useWaterSystem();

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
    maxCapacity: 100
  };

  /**
   * @description initialGlacierData is the initial state of the glacier.
   * @type {GlacierStateInterface}
   */
  const initialGlacierData: GlacierStateInterface = {
    id: crypto.randomUUID(),
    name: "Glacier principal",
    meltRate: 0.5,
    volume: 1000000,
    outflowRate: 0.5,
    lastUpdated: new Date()
  };

  /**
   * @description initialRiverData is the initial state of the river.
   * @type {RiverStateInterface}
   */
  const initialRiverData: RiverStateInterface = {
    id: crypto.randomUUID(),
    name: "Rivière principale",
    flowRate: 20,
    waterVolume: 500000,
    lastUpdated: new Date()
  };

  /**
   * @description initializeDam is a function that initializes the dam instance.
   * @param {DamInterface} damData - The initial state of the dam.
   * @returns {void}
   */
  initializeDam(initialDamData);

  /**
   * @description initializeGlacier is a function that initializes the glacier instance.
   * @param {GlacierStateInterface} glacierData - The initial state of the glacier.
   * @returns {void}
   */
  initializeGlacier(initialGlacierData);

  /**
   * @description initializeRiver is a function that initializes the river instance.
   * @param {RiverStateInterface} riverData - The initial state of the river.
   * @returns {void}
   */
  initializeRiver(initialRiverData);

  /**
   * @description systemStateSubscription is a subscription to the systemState$ observable.
   * @type {Subscription}
   */
  systemStateSubscription = systemState$.subscribe({
    next: (state) => {
      damState.value = state.dam;
      glacierState.value = state.glacier;
      riverState.value = state.river;
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
