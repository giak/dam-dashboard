<template>
  <div :class="`border-l-2 border-${color}-500 pl-3`">
    <p class="text-sm font-medium text-gray-500 mb-1">{{ label }}</p>
    <p :class="`text-xl font-bold text-${color}-600`">
      <Transition name="fade" mode="out-in">
        <span :key="value">{{ formattedValue }}</span>
      </Transition>
      {{ unit }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PropsInterface {
  label: string;
  value: number;
  unit: string;
  color: string;
  precision: number;
}

const props = defineProps<PropsInterface>();

const formattedValue = computed(() => props.value.toFixed(props.precision));
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
