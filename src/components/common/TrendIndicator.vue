<template>
    <i :class="iconName + ' ' + colorClass"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface PropsInterface {
  currentValue: number;
  previousValue: number | null;
  upColor?: string;
  downColor?: string;
  stableColor?: string;
}

const props = withDefaults(defineProps<PropsInterface>(), {
  upColor: 'text-green-500',
  downColor: 'text-red-500',
  stableColor: 'text-gray-500'
});

const trend = computed(() => {
  if (props.previousValue === null) return 'stable';
  if (props.currentValue > props.previousValue) return 'up';
  if (props.currentValue < props.previousValue) return 'down';
  return 'stable';
});

const iconName = computed(() => {
  switch (trend.value) {
    case 'up': return 'pi pi-arrow-up';
    case 'down': return 'pi pi-arrow-down';
    default: return 'pi pi-minus';
  }
});

const colorClass = computed(() => {
  switch (trend.value) {
    case 'up': return props.upColor;
    case 'down': return props.downColor;
    default: return props.stableColor;
  }
});
</script>
