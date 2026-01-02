<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'

const email = ref('')
const password = ref('')
const auth = useAuthStore()
const error = ref('')

const submit = async () => {
  try {
    await auth.signIn(email.value, password.value)
    await navigateTo('/')
  } catch (err: any) {
    error.value = err.message
  }
}
</script>

<template>
  <v-container class="d-flex justify-center align-center" style="height: 100vh">
    <v-card width="400" class="pa-6">
      <v-card-title>Login</v-card-title>

      <v-text-field label="Email" v-model="email" />
      <v-text-field label="Password" type="password" v-model="password" />

      <v-alert v-if="error" type="error" class="mb-3">
        {{ error }}
      </v-alert>

      <v-btn color="primary" block @click="submit">
        Login
      </v-btn>
    </v-card>
  </v-container>
</template>
