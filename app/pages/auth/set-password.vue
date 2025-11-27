<template>
  <div class="pa-6 max-w-400 mx-auto">
    <h2 class="text-h5 mb-4">Set Your Password</h2>

    <v-alert
      v-if="error"
      type="error"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <v-text-field
      v-model="password"
      label="New Password"
      type="password"
      class="mb-4"
    />

    <v-btn color="primary" block @click="savePassword">
      Save Password
    </v-btn>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useNuxtApp } from '#app'

const { $supabase } = useNuxtApp()
const password = ref('')
const error = ref('')

async function savePassword() {
  const { error: err } = await $supabase.auth.updateUser({ password: password.value })

  if (err) {
    error.value = err.message
  } else {
    navigateTo('/dean/dashboard')
  }
}
</script>
