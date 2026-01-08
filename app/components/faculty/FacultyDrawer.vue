<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold">
        {{ editing ? 'Edit Faculty' : 'New Faculty' }}
      </v-card-title>

      <v-card-text class="pt-4">
        <v-text-field
          v-model="form.first_name"
          label="First Name"
          required
        />

        <v-text-field
          v-model="form.middle_name"
          label="Middle Name (optional)"
        />

        <v-text-field
          v-model="form.last_name"
          label="Last Name"
          required
        />

        <!-- EMAIL ONLY ON CREATE -->
        <v-text-field
          v-if="!editing"
          v-model="form.email"
          label="Email"
          type="email"
          required
        />

        <v-select
          v-model="form.faculty_type"
          label="Faculty Type"
          :items="facultyTypes"
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
          :disabled="!canSave"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from "vue"

const props = defineProps<{
  modelValue: boolean
  editing: boolean
  item?: any
}>()

const emit = defineEmits(["update:modelValue", "save"])

const form = reactive({
  email: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  faculty_type: "FULL_TIME"
})

watch(
  () => props.item,
  (v) => {
    if (v) {
      form.email = ""
      form.first_name = v.first_name
      form.middle_name = v.middle_name
      form.last_name = v.last_name
      form.faculty_type = v.faculty_type
    } else {
      form.email = ""
      form.first_name = ""
      form.middle_name = ""
      form.last_name = ""
      form.faculty_type = "FULL_TIME"
    }
  },
  { immediate: true }
)

const facultyTypes = [
  { title: "Full-Time", value: "FULL_TIME" },
  { title: "Part-Time", value: "PART_TIME" }
]

const canSave = computed(() =>
  !!form.first_name &&
  !!form.last_name &&
  !!form.faculty_type &&
  (props.editing || !!form.email)
)

function save() {
  const payload: any = { ...form }

  // 🚨 CRITICAL FIX: DO NOT SEND EMAIL ON UPDATE
  if (props.editing) {
    delete payload.email
  }

  emit("save", payload)
}
</script>
