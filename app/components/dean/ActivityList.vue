<template>
  <v-card>
    <v-card-title>Recent Activity</v-card-title>

    <v-list density="compact">
      <v-list-item
        v-for="a in activities"
        :key="a.created_at"
        class="activity-item"
      >
        <template #prepend>
          <v-icon
            size="18"
            color="primary"
          >
            mdi-history
          </v-icon>
        </template>

        <v-list-item-title class="activity-title">
          {{ formatAction(a.action) }}
        </v-list-item-title>

        <v-list-item-subtitle class="activity-sub">
          {{ a.entity_type }} • {{ formatDate(a.created_at) }}
        </v-list-item-subtitle>
      </v-list-item>

      <v-list-item v-if="!activities.length">
        <v-list-item-title class="text-grey">
          No recent activity
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{ activities: any[] }>()

function formatAction(action: string) {
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function formatDate(date: string) {
  return new Date(date).toLocaleString()
}
</script>

<style scoped>
.activity-item {
  padding: 8px 12px;
}

.activity-title {
  font-weight: 500;
}

.activity-sub {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
