<template>
  <v-card>
    <v-data-table
      :headers="headers"
      :items="items"
      :loading="loading"
      item-key="id"
      density="comfortable"
    >
      <!-- Adviser -->
      <template #item.adviser="{ item }">
        {{
          item.adviser
            ? `${item.adviser.first_name} ${item.adviser.last_name}`
            : "—"
        }}
      </template>

      <!-- Remarks -->
      <template #item.remarks="{ item }">
        {{ item.remarks || "—" }}
      </template>

      <!-- Status -->
      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="statusColor(item.status)"
          variant="tonal"
        >
          {{ item.status }}
        </v-chip>
      </template>

      <!-- Actions -->
      <template #item.actions="{ item }">
        <v-btn
          icon
          size="small"
          :disabled="item.status === 'LOCKED'"
          @click="$emit('edit', item)"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>

        <v-btn
          icon
          size="small"
          color="error"
          :disabled="item.status === 'LOCKED'"
          @click="$emit('delete', item.id)"
        >
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>

      <!-- EMPTY -->
      <template #no-data>
        <div class="text-center pa-6 text-grey">
          No classes created yet.
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

defineEmits(["edit", "delete"])

const headers = [
  { title: "Program", value: "program" },
  { title: "Year", value: "year_level" },
  { title: "Section", value: "section" },
  { title: "Adviser", value: "adviser" },
  { title: "Remarks", value: "remarks" },
  { title: "Status", value: "status" },
  { title: "Actions", value: "actions", sortable: false }
]

function statusColor(status: string) {
  switch (status) {
    case "LOCKED": return "red"
    case "PUBLISHED": return "green"
    case "DRAFT": return "orange"
    case "NO_SCHEDULE": return "grey"
    default: return "grey"
  }
}
</script>
