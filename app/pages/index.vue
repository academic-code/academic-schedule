<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'
import { watchEffect } from 'vue'

const auth = useAuthStore()

watchEffect(() => {
  if (!auth.loading && auth.user) {
    if (auth.user.role === 'ADMIN') navigateTo('/admin/dashboard')
    if (auth.user.role === 'DEAN') navigateTo('/dean/dashboard')
    if (auth.user.role === 'FACULTY') navigateTo('/faculty/schedule')
  }
})
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-progress-circular
      indeterminate
      color="primary"
      size="48"
    />
  </v-container>
</template>
