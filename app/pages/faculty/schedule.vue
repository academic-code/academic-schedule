<template>
  <v-card>
    <v-card-title>My Schedule</v-card-title>
    <v-card-text>
      View assigned schedules.
    </v-card-text>
  </v-card>
</template>

<script setup>
definePageMeta({
  middleware: 'role',
  roles: ['FACULTY']
})
</script>
