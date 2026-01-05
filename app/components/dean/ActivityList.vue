<template>
  <v-card>
    <v-card-title>Recent Activity</v-card-title>
    <v-list>
      <v-list-item
        v-for="a in activities"
        :key="a.created_at"
      >
        <v-list-item-title>
          {{ a.action }} — {{ a.entity_type }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ new Date(a.created_at).toLocaleString() }}
        </v-list-item-subtitle>
      </v-list-item>
      <v-list-item v-if="!activities.length">
        <v-list-item-title>No activity yet</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ activities: any[] }>()
</script>
