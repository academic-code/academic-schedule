<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const app = useAppStore()
</script>

<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title>{{ app.test }}</v-card-title>
    </v-card>
  </v-container>
</template>
