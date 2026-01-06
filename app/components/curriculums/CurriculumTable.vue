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

      <!-- CURRICULUM CODE + SUBJECT COUNT -->
      <template #item.curriculum_code="{ item }">
        <div class="d-flex align-center">
          <span>{{ item.curriculum_code }}</span>

          <v-chip
            v-if="item.subjects_count !== undefined"
            size="x-small"
            class="ml-2"
            color="primary"
            variant="tonal"
          >
            {{ item.subjects_count }} subjects
          </v-chip>
        </div>
      </template>

      <!-- EFFECTIVE YEAR -->
      <template #item.effective_year="{ item }">
        {{ item.effective_year }}
      </template>

      <!-- ACTIVE TOGGLE -->
      <template #item.is_active="{ item }">
        <v-switch
          :model-value="item.is_active"
          color="green"
          inset
          hide-details
          :disabled="item.is_locked"
          @update:model-value="val => emitToggle(item.id, val)"
        />
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
              :disabled="item.is_locked"
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

        <v-tooltip
          :text="item.is_locked ? 'Curriculum is locked' : 'Delete curriculum'"
        >
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
          No curriculums found.
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
const props = defineProps<{
  items: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "edit", item: any): void
  (e: "delete", id: string): void
  (e: "upload", item: any): void
  (e: "toggle", id: string, value: boolean): void
}>()

const headers = [
  { title: "Program", value: "program", sortable: true },
  { title: "Curriculum", value: "curriculum_code" },
  { title: "Effective Year", value: "effective_year", sortable: true },
  { title: "Active", value: "is_active", sortable: false },
  { title: "Created", value: "created_at", sortable: true },
  { title: "Actions", value: "actions", sortable: false }
]

function emitToggle(id: string, value: boolean) {
  emit("toggle", id, value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString()
}
</script>
