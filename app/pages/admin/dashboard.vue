<template>
  <v-card>
    <v-card-title>Admin Dashboard</v-card-title>
    <v-card-text>
      System overview and management.
    </v-card-text>
  </v-card>
</template>

<script setup>
definePageMeta({
  middleware: 'role',
  roles: ['ADMIN']
})
</script>
