<template>
  <ErrorNotification
    v-if="currentError"
    :message="currentError"
    @close="clearError"
  />
</template>

<script setup lang="ts">
import { errorHandlingService } from '@services/errorHandlingService';
import { onMounted, onUnmounted, ref } from 'vue';
import ErrorNotification from './ErrorNotification.vue';

const currentError = ref<string | null>(null);

let errorSubscription: any;

onMounted(() => {
  errorSubscription = errorHandlingService.getErrorObservable().subscribe(
    (error) => {
      if (error) {
        currentError.value = `${error.context}: ${error.message}`;
        // Optionnel : Effacer automatiquement l'erreur après un certain temps
        setTimeout(() => {
          clearError();
        }, 5000);
      }
    }
  );
});

onUnmounted(() => {
  if (errorSubscription) {
    errorSubscription.unsubscribe();
  }
});

function clearError() {
  currentError.value = null;
}
</script>
