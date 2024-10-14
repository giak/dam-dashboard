<template>
  <div class="water-level-chart">
    <h3>Niveau d'eau: {{ currentWaterLevel.toFixed(2) }} m</h3>
    <!-- Ici, vous pouvez ajouter le code pour le graphique -->
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentWaterLevel: number;
}>();
</script>

<style scoped>
.water-level-chart {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
