<template>
  <v-card elevation="1">
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="id"
      density="comfortable"
    >
      <!-- COURSE CODE -->
      <template #item.course_code="{ item }">
        <strong>{{ item.course_code }}</strong>
      </template>

      <!-- DESCRIPTION -->
      <template #item.description="{ item }">
        <div class="text-truncate" style="max-width: 280px">
          {{ item.description }}
        </div>
      </template>

      <!-- TYPE -->
      <template #item.subject_type="{ item }">
        <v-chip size="x-small" variant="tonal">
          {{ item.subject_type }}
        </v-chip>
      </template>

      <!-- UNITS -->
      <template #item.units="{ item }">
        {{ item.total_units }}
        <span class="text-grey text-caption">
          ({{ item.lec_units }}L / {{ item.lab_units }}Lab)
        </span>
      </template>

      <!-- LOCK -->
      <template #item.is_locked="{ item }">
        <v-chip
          size="x-small"
          :color="item.is_locked ? 'red' : 'green'"
          variant="tonal"
        >
          {{ item.is_locked ? "Locked" : "Editable" }}
        </v-chip>
      </template>

      <!-- ACTIONS -->
      <template #item.actions="{ item }">
        <v-tooltip text="Edit">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              :disabled="item.is_locked"
              @click="$emit('edit', item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Delete">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              color="error"
              :disabled="item.is_locked"
              @click="$emit('delete', item.id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <!-- EMPTY -->
      <template #no-data>
        <div class="text-center pa-6 text-grey">
          No subjects found for the selected filters.
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
defineProps<{
  items: any[]
  loading: boolean
}>()

defineEmits<{
  (e: "edit", item: any): void
  (e: "delete", id: string): void
}>()

const headers = [
  { title: "Code", value: "course_code" },
  { title: "Description", value: "description" },
  { title: "Type", value: "subject_type" },
  { title: "Year", value: "year_level" },
  { title: "Sem", value: "semester" },
  { title: "Units", value: "units" },
  { title: "Status", value: "is_locked" },
  { title: "Actions", value: "actions", sortable: false }
]
</script>
