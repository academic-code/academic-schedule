<template>
  <v-card>
    <v-card-title>Dean Dashboard</v-card-title>
    <v-card-text>
      Department overview.
    </v-card-text>
  </v-card>
</template>

<script setup>
definePageMeta({
  middleware: 'role',
  roles: ['DEAN']
})
</script>
