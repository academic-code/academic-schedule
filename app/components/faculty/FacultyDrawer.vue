<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="font-weight-bold text-h6">
        {{ editing ? "Edit Faculty" : "New Faculty" }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-6">
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.first_name"
              label="First Name"
              variant="outlined"
              required
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.middle_name"
              label="Middle Name"
              variant="outlined"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.last_name"
              label="Last Name"
              variant="outlined"
              required
            />
          </v-col>

          <v-col cols="12" v-if="!editing">
            <v-text-field
              v-model="form.email"
              label="Email Address"
              type="email"
              variant="outlined"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-select
              v-model="form.faculty_type"
              label="Faculty Type"
              :items="facultyTypes"
              variant="outlined"
              required
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!canSave || saving"
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
import { useFacultyStore } from "@/stores/useFacultyStore"

const store = useFacultyStore()

const props = defineProps<{
  modelValue: boolean
  editing: boolean
  item?: any
}>()

const emit = defineEmits(["update:modelValue", "save"])

const saving = computed(() => store.saving)

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
  if (props.editing) delete payload.email
  emit("save", payload)
}
</script>
