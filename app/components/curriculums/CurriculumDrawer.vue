<template>
  <v-dialog :model-value="modelValue" max-width="520"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold">
        {{ editing ? "Edit Curriculum" : "New Curriculum" }}
      </v-card-title>

      <v-card-text>
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <v-text-field
          v-model="form.program"
          label="Program (BSIT, DIT, etc.)"
          required
        />

        <v-text-field
          v-model="form.curriculum_code"
          label="Curriculum Code (e.g. 2023–2024)"
          required
        />

        <v-text-field
          v-model.number="form.effective_year"
          label="Effective Year"
          type="number"
          required
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>
        <v-btn color="primary" :disabled="!canSave" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, watch, computed, ref } from "vue"

const props = defineProps<{
  modelValue: boolean
  editing: boolean
  item?: any
}>()

const emit = defineEmits(["update:modelValue", "save"])
const error = ref<string | null>(null)

const form = reactive({
  program: "",
  curriculum_code: "",
  effective_year: new Date().getFullYear()
})

watch(
  () => props.item,
  (v) => {
    error.value = null
    if (v) Object.assign(form, v)
    else {
      form.program = ""
      form.curriculum_code = ""
      form.effective_year = new Date().getFullYear()
    }
  },
  { immediate: true }
)

const canSave = computed(() =>
  !!form.program &&
  !!form.curriculum_code &&
  !!form.effective_year
)

function save() {
  if (!canSave.value) {
    error.value = "All fields are required"
    return
  }
  emit("save", { ...form })
}
</script>
