<template>
  <div class="stat-item">
    <span class="font-semibold">{{ label }}:</span>
    <span>{{ formattedValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: number | string;
  unit?: string;
  precision?: number;
}>();

const formattedValue = computed(() => {
  if (typeof props.value === 'number' && props.precision !== undefined) {
    return `${props.value.toFixed(props.precision)}${props.unit ? ` ${props.unit}` : ''}`;
  }
  return props.value;
});
</script>
