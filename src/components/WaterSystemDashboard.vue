<template>
  <div class="water-system-dashboard">
    <h1 class="text-3xl font-bold mb-6">Tableau de bord du système d'eau</h1>
    <DamComponent v-if="damState" :damState="damState" />
  </div>
</template>

<script setup lang="ts">
import DamComponent from '@components/dam/DamComponent.vue';
import { useWaterSystem } from '@composables/useWaterSystem';
import type { DamInterface } from '@type/dam/DamInterface';
import { Subscription } from 'rxjs';
import { onMounted, onUnmounted, ref } from 'vue';

/**
 * @description damState is a ref that holds the dam state.
 * @type {Ref<DamInterface | null>}
 */ 
const damState = ref<DamInterface | null>(null);

/**
 * @description { initializeDam, systemState$, cleanup } is an object that contains the initializeDam function, the systemState$ observable, and the cleanup function.
 * @type {Object}
 */
const { initializeDam, systemState$, cleanup } = useWaterSystem();

/**
 * @description subscription is a subscription to the systemState$ observable.
 * @type {Subscription}
 */
let subscription: Subscription | null = null;

/**
 * @description onMounted is a lifecycle hook that is called when the component is mounted.
 * @returns {void}
 */
onMounted(() => {
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
    lastUpdated: new Date()
  };

  /**
   * @description initializeDam is a function that initializes the dam instance.
   * @param {DamInterface} damData - The initial state of the dam.
   * @returns {void}
   */
  initializeDam(initialDamData);

  /**
   * @description subscription is a subscription to the systemState$ observable.
   * @type {Subscription}
   */
  subscription = systemState$.subscribe({
    next: (state) => {
      damState.value = state;
    },
    error: (err) => console.error('Erreur dans la souscription systemState$:', err)
  });
});

/**
 * @description onUnmounted is a lifecycle hook that is called when the component is unmounted.
 * @returns {void}
 */
onUnmounted(() => {
  subscription?.unsubscribe();
  /**
   * @description cleanup is a function that unsubscribes from the dam instance and completes the dam$ observable.
   * @returns {void}
   */
  cleanup();
});
</script>
