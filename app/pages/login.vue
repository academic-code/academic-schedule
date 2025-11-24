<template>
  <v-container class="d-flex align-center justify-center" style="height:100vh">
    <v-card width="420" class="pa-6" elevation="4" rounded="lg">
      <h2 class="text-h5 text-center mb-6">Academic Scheduler Login</h2>

      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          variant="outlined"
          :disabled="!!auth.loading"
          class="mb-4"
        />

        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          variant="outlined"
          :disabled="!!auth.loading"
          class="mb-4"
        />

        <v-btn type="submit" color="primary" block :loading="!!auth.loading">
          Login
        </v-btn>
      </v-form>

      <v-alert v-if="auth.error" type="error" variant="tonal" class="mt-4">
        {{ auth.error }}
      </v-alert>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthComposable } from '@/composables/useAuth'

const email = ref('')
const password = ref('')

const auth = useAuthComposable()

watch(
  () => auth.currentUser.value,
  () => {
    if (!auth.currentUser.value) return

    if (auth.userRole.value === 'ADMIN') navigateTo('/admin/dashboard')
    if (auth.userRole.value === 'DEAN') navigateTo('/dean/dashboard')
    if (auth.userRole.value === 'FACULTY') navigateTo('/faculty/schedules')
  }
)

async function handleLogin() {
  await auth.login(email.value, password.value)
}
</script>
