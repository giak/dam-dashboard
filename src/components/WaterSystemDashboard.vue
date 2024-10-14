<template>
  <div class="water-system-dashboard">
    <h1 class="text-3xl font-bold mb-6">Tableau de bord du système d'eau</h1>
    <DamComponent :initialData="initialDamData" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DamComponent from '@components/dam/DamComponent.vue';
import type { DamInterface } from '@/types/dam/DamInterface';
import { v4 as uuidv4 } from 'uuid';

const initialDamData = ref<DamInterface>({
  id: uuidv4(),
  name: "Barrage principal",
  currentWaterLevel: 50,
  maxWaterLevel: 100,
  minWaterLevel: 0,
  outflowRate: 25,
  inflowRate: 30, // Assurez-vous que cette valeur est différente de outflowRate
  lastUpdated: new Date()
});
</script>

