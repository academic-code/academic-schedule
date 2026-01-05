<template>
  <v-card>
    <v-card-title>Notifications</v-card-title>
    <v-list>
      <v-list-item
        v-for="n in notifications"
        :key="n.id"
      >
        <v-list-item-title>{{ n.title }}</v-list-item-title>
        <v-list-item-subtitle>{{ n.message }}</v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="!notifications.length">
        <v-list-item-title>No notifications</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ notifications: any[] }>()
</script>
