<template>
  <v-card elevation="1">
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="id"
      class="elevation-0"
    >
      <!-- PROGRAM -->
      <template #item.program="{ item }">
        <div class="font-weight-bold">
          {{ item.program }}
        </div>
      </template>

      <!-- CURRICULUM VERSION -->
      <template #item.curriculum="{ item }">
        <span>
          {{ item.curriculum_code }}
        </span>
      </template>

      <!-- EFFECTIVE YEAR -->
      <template #item.effective_year="{ item }">
        {{ item.effective_year }}
      </template>

      <!-- STATUS -->
      <template #item.is_active="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.is_active ? 'green' : 'grey'"
        >
          {{ item.is_active ? "Active" : "Inactive" }}
        </v-chip>
      </template>

      <!-- CREATED -->
      <template #item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>

      <!-- ACTIONS -->
      <template #item.actions="{ item }">
        <v-tooltip text="Edit curriculum">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              @click="$emit('edit', item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Upload subjects">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              color="primary"
              @click="$emit('upload', item)"
            >
              <v-icon>mdi-upload</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="Delete curriculum">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              size="small"
              color="error"
              @click="$emit('delete', item.id)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
      </template>

      <!-- EMPTY STATE -->
      <template #no-data>
        <div class="text-center pa-6 text-grey">
          No curriculums found.
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

defineEmits(["edit", "delete", "upload"])

const headers = [
  { title: "Program", value: "program", sortable: true },
  { title: "Curriculum Version", value: "curriculum" },
  { title: "Effective Year", value: "effective_year", sortable: true },
  { title: "Status", value: "is_active", sortable: false },
  { title: "Created", value: "created_at", sortable: true },
  { title: "Actions", value: "actions", sortable: false }
]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString()
}
</script>
