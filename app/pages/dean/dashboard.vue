<template>
  <div class="pa-6 dashboard-container">
    <DashboardHeader
      :dean="dashboard.dean"
      :department="dashboard.department"
      :term="dashboard.academicTerm"
    />

    <v-alert
      v-if="dashboard.academicTerm.is_locked"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      Academic term is locked. Scheduling changes are disabled.
    </v-alert>

    <StatCards :stats="dashboard.stats" />

    <WarningPanel
      v-if="dashboard.hasWarnings"
      :warnings="dashboard.warnings"
      class="mb-6"
    />

    <v-row dense>
      <v-col cols="12" lg="6">
        <NotificationList :notifications="dashboard.notifications" />
      </v-col>

      <v-col cols="12" lg="6">
        <ActivityList :activities="dashboard.recentActivity" />
      </v-col>
    </v-row>

    <v-progress-linear
      v-if="dashboard.loading"
      indeterminate
      class="mt-6"
    />

    <v-alert
      v-if="dashboard.error"
      type="error"
      class="mt-6"
    >
      {{ dashboard.error }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue"
import { useDeanDashboardStore } from "@/stores/useDeanDashboardStore"
import { useSupabase } from "@/composables/useSupabase"

import DashboardHeader from "@/components/dean/DashboardHeader.vue"
import StatCards from "@/components/dean/StatCards.vue"
import WarningPanel from "@/components/dean/WarningPanel.vue"
import NotificationList from "@/components/dean/NotificationList.vue"
import ActivityList from "@/components/dean/ActivityList.vue"

const dashboard = useDeanDashboardStore()
const supabase = useSupabase()

let channels: any[] = []

onMounted(async () => {
  await dashboard.fetchDashboard()

  const termChannel = supabase
    .channel("academic-term-lock")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "academic_terms" },
      (payload) => {
        if (payload.new.is_locked) {
          dashboard.notifications.unshift({
            id: crypto.randomUUID(),
            title: "Academic Term Locked",
            message: "Scheduling has been locked by the administrator.",
            created_at: new Date().toISOString()
          })
          dashboard.academicTerm.is_locked = true
        }
      }
    )
    .subscribe()

  channels.push(termChannel)
})

onBeforeUnmount(() => {
  channels.forEach((c) => supabase.removeChannel(c))
})
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
