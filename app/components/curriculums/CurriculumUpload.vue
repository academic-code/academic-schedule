<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold">
        Upload Subjects (CSV)
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">
          Curriculum:
          <strong>{{ curriculum?.program }}</strong>
          ({{ curriculum?.curriculum_code }})
        </v-alert>

        <!-- FILE INPUT -->
        <v-file-input
          v-model="file"
          accept=".csv"
          label="Select CSV file"
          prepend-icon="mdi-file-upload"
          @update:model-value="parse"
        />

        <!-- PREVIEW -->
        <v-data-table
          v-if="preview.length"
          :headers="headers"
          :items="preview"
          class="mt-4"
          density="compact"
        >
          <template #item.valid="{ item }">
            <v-chip
              size="x-small"
              :color="item.valid ? 'green' : 'red'"
              variant="tonal"
            >
              {{ item.valid ? "OK" : "Invalid" }}
            </v-chip>
          </template>
        </v-data-table>

        <v-alert
          v-if="preview.length && invalidCount"
          type="warning"
          variant="tonal"
          class="mt-3"
        >
          {{ invalidCount }} invalid rows will be skipped.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!file || !preview.length"
          @click="submit"
        >
          Upload
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"

/* ================= PROPS ================= */

const props = defineProps<{
  modelValue: boolean
  curriculum: any | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void
  (e: "submit", file: File): void
}>()

/* ================= STATE ================= */

const file = ref<File | null>(null)
const preview = ref<any[]>([])

/* ================= CSV PARSER ================= */

function parse() {
  preview.value = []
  if (!file.value) return

  const reader = new FileReader()
  reader.onload = () => {
    const text = typeof reader.result === "string" ? reader.result : ""
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return

    const headerLine = lines[0] ?? ""
    const headers = headerLine.split(",").map(h => h.trim())

    preview.value = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim())
      const row: any = {}

      headers.forEach((h, i) => (row[h] = values[i]))

      const valid =
        !!row.course_code &&
        !!row.description &&
        !!row.year_level &&
        !!row.semester

      return {
        ...row,
        valid
      }
    })
  }
  reader.readAsText(file.value)
}

/* ================= COMPUTED ================= */

const invalidCount = computed(
  () => preview.value.filter(r => !r.valid).length
)

/* ================= ACTIONS ================= */

function submit() {
  if (!file.value) return
  emit("submit", file.value)
  reset()
}

function close() {
  reset()
  emit("update:modelValue", false)
}

function reset() {
  file.value = null
  preview.value = []
}

const headers = [
  { title: "Course Code", value: "course_code" },
  { title: "Description", value: "description" },
  { title: "Year", value: "year_level" },
  { title: "Semester", value: "semester" },
  { title: "Status", value: "valid" }
]
</script>
