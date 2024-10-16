<script setup lang="ts">
import { errorHandlingService, type ErrorDataInterface } from '@services/errorHandlingService';
import { Subscription } from 'rxjs';
import { onMounted, onUnmounted, ref } from 'vue';

const errors = ref<ErrorDataInterface[]>([]);
let subscription: Subscription | null = null;

onMounted(() => {
  subscription = errorHandlingService.getErrorObservable().subscribe(
    (error) => {
      errors.value.push(error);
      // Optionnel : Supprimer l'erreur après un certain temps
      setTimeout(() => {
        errors.value.shift();
      }, 5000);
    }
  );
});

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe();
  }
});

const removeError = (index: number) => {
  errors.value.splice(index, 1);
};
</script>

<template>
  <div class="error-notifications">
    <div v-for="(error, index) in errors" :key="error.timestamp" class="error-notification">
      <div class="error-content">
        <strong>{{ error.context }}</strong>: {{ error.message }}
      </div>
      <button @click="removeError(index)" class="close-button">&times;</button>
    </div>
  </div>
</template>

<style scoped>
.error-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.error-notification {
  background-color: #ff4444;
  color: white;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}
</style>
