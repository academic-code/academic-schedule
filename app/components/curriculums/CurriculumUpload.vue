<template>
  <v-dialog :model-value="modelValue" max-width="420"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold">
        Upload Subjects (CSV)
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-3">
          Upload subjects for <strong>{{ curriculum?.program }}</strong>
          ({{ curriculum?.curriculum_code }})
        </v-alert>

        <v-file-input
          v-model="file"
          accept=".csv"
          label="CSV File"
          required
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!file"
          @click="submit"
        >
          Upload
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue"

defineProps<{
  modelValue: boolean
  curriculum: any | null
}>()

const emit = defineEmits(["update:modelValue", "submit"])
const file = ref<File | null>(null)

function submit() {
  if (!file.value) return
  emit("submit", file.value)
  file.value = null
}
</script>
