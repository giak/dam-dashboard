<template>
  <div id="app" class="container mx-auto p-4">
    <WaterSystemDashboard />
    <GlobalErrorHandler />
  </div>
</template>

<script setup lang="ts">
import WaterSystemDashboard from '@components/WaterSystemDashboard.vue';
import GlobalErrorHandler from '@components/GlobalErrorHandler.vue';
</script>
