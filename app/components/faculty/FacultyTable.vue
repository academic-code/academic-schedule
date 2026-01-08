<template>
  <v-card elevation="1">
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="id"
      density="comfortable"
    >
      <!-- NAME -->
      <template #item.name="{ item }">
        <div class="font-weight-medium">
          {{ item.last_name }}, {{ item.first_name }}
          <span v-if="item.middle_name"> {{ item.middle_name }}</span>
        </div>
      </template>

      <!-- EMAIL -->
      <template #item.email="{ item }">
        <span class="text-body-2">
          {{ item.email || "—" }}
        </span>
      </template>

      <!-- FACULTY TYPE -->
      <template #item.faculty_type="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.faculty_type === 'FULL_TIME' ? 'green' : 'blue'"
        >
          {{ item.faculty_type === "FULL_TIME" ? "Full-Time" : "Part-Time" }}
        </v-chip>
      </template>

      <!-- STATUS (PENDING / ACTIVATED) -->
      <template #item.status="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.status === 'ACTIVATED' ? 'green' : 'orange'"
        >
          {{ item.status === "ACTIVATED" ? "Activated" : "Pending" }}
        </v-chip>
      </template>

      <!-- ACTIONS -->
      <template #item.actions="{ item }">
        <!-- EDIT -->
        <v-tooltip text="Edit Faculty">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              :disabled="locked"
              @click="$emit('edit', item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <!-- RESEND INVITE (ONLY IF PENDING) -->
        <v-tooltip
          v-if="item.status === 'PENDING'"
          text="Resend Invitation"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              color="info"
              variant="tonal"
              :disabled="locked"
              @click="$emit('resend', item)"
            >
              <v-icon>mdi-email-sync</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <!-- ACTIVATE / DEACTIVATE (ONLY IF ACTIVATED) -->
        <v-tooltip
          v-if="item.status === 'ACTIVATED'"
          :text="item.is_active ? 'Deactivate Faculty' : 'Activate Faculty'"
        >
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              :color="item.is_active ? 'error' : 'success'"
              :disabled="locked"
              @click="$emit('toggle', item)"
            >
              <v-icon>
                {{ item.is_active ? "mdi-account-off" : "mdi-account-check" }}
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <!-- EMPTY STATE -->
      <template #no-data>
        <div class="text-center pa-6 text-grey">
          No faculty members found.
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  items: any[]
  loading: boolean
  locked: boolean
}>()

defineEmits(["edit", "toggle", "resend"])

const headers = [
  { title: "Name", value: "name" },
  { title: "Email", value: "email" },
  { title: "Type", value: "faculty_type" },
  { title: "Status", value: "status" },
  { title: "Actions", value: "actions", sortable: false }
]
</script>
