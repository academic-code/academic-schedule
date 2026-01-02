<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const submit = async () => {
  error.value = ''
  loading.value = true

  try {
    await auth.signIn(email.value, password.value)
  } catch (err: any) {
    error.value = err.message || 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-bg">
    <v-card
      class="login-card pa-8"
      elevation="10"
      width="420"
    >
      <!-- LOGO -->
      <div class="d-flex justify-center mb-6">
        <v-img
          src="/Logo.png"
          max-width="200"
          contain
        />
      </div>

      <!-- TITLE -->
      <div class="text-center mb-6">
        <h2 class="font-weight-bold">Academic Scheduler</h2>
        <p class="text-medium-emphasis text-body-2">
          Sign in to manage schedules
        </p>
      </div>

      <!-- ERROR -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        {{ error }}
      </v-alert>

      <!-- EMAIL -->
      <v-text-field
        v-model="email"
        label="Email address"
        type="email"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        prepend-inner-icon="mdi-email-outline"
        class="mb-3"
        @keyup.enter="submit"
      />

      <!-- PASSWORD -->
      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        variant="outlined"
        density="comfortable"
        rounded="lg"
        prepend-inner-icon="mdi-lock-outline"
        class="mb-6"
        @keyup.enter="submit"
      />

      <!-- LOGIN BUTTON -->
      <v-btn
        block
        size="large"
        color="primary"
        rounded="lg"
        :loading="loading"
        :disabled="loading || !email || !password"
        @click="submit"
      >
        Login
      </v-btn>

      <!-- FOOTER -->
      <div class="text-center mt-6 text-caption text-medium-emphasis">
        © {{ new Date().getFullYear() }} Academic Scheduler System
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Subtle academic gradient */
  background: linear-gradient(
    135deg,
    #f4f7fb,
    #e9eef6
  );
}

.login-card {
  border-radius: 20px;
}
</style>
