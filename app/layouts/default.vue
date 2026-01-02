<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
</script>

<template>
  <v-app>
    <v-layout>
      <!-- Sidebar -->
      <AppSidebar v-if="auth.user" />

      <!-- Main Content -->
      <v-main>
        <v-container fluid>
          <slot />
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>
