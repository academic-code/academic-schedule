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

      <!-- EMAIL (FROM USERS TABLE) -->
      <template #item.email="{ item }">
        <span class="text-body-2">
          {{ item.email || "—" }}
        </span>
      </template>

      <!-- TYPE (COLOR LEGEND) -->
      <template #item.faculty_type="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.faculty_type === 'FULL_TIME' ? 'green' : 'blue'"
        >
          {{ item.faculty_type === 'FULL_TIME' ? 'Full-Time' : 'Part-Time' }}
        </v-chip>
      </template>

      <!-- STATUS -->
      <template #item.is_active="{ item }">
        <v-chip
          size="small"
          :color="item.is_active ? 'green' : 'grey'"
          variant="tonal"
        >
          {{ item.is_active ? 'Active' : 'Inactive' }}
        </v-chip>
      </template>

      <!-- ACTIONS -->
      <template #item.actions="{ item }">
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

          <v-tooltip text="Resend Invite">
  <template #activator="{ props }">
    <v-btn
      v-bind="props"
      icon="mdi-email-send"
      size="small"
      color="info"
      variant="tonal"
      :disabled="locked || !item.email"
      @click="$emit('resend', item)"
    />
  </template>
</v-tooltip>



        <v-tooltip
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
                {{ item.is_active ? 'mdi-account-off' : 'mdi-account-check' }}
              </v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <!-- EMPTY -->
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
  { title: "Status", value: "is_active" },
  { title: "Actions", value: "actions", sortable: false }
]
</script>
