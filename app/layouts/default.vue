<script setup lang="ts">
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
</script>

<template>
  <v-app>
    <v-layout>
      <AppSidebar v-if="auth.user" />

      <v-main>
        <v-container fluid>
          <slot />
        </v-container>
      </v-main>
    </v-layout>
  </v-app>
</template>
