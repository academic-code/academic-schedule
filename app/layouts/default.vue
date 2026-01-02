<script setup lang="ts">
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotifyStore } from '@/stores/useNotifyStore'

const auth = useAuthStore()
const notify = useNotifyStore()
</script>

<template>
  <v-app>
    <v-layout>
      <!-- SIDEBAR -->
      <AppSidebar v-if="auth.user" />

      <!-- MAIN -->
      <v-main>
        <v-container fluid>
          <slot />
        </v-container>
      </v-main>
    </v-layout>

    <!-- GLOBAL NOTIFICATION -->
    <v-snackbar
      v-model="notify.show"
      :color="notify.color"
      timeout="3000"
      location="top right"
    >
      {{ notify.message }}
    </v-snackbar>
  </v-app>
</template>
