<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="font-weight-bold">
        {{ editing ? "Edit Subject" : "New Subject" }}
      </v-card-title>

      <v-card-text class="pt-4">
        <v-alert
          v-if="!curriculumId"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Please select a curriculum before adding a subject.
        </v-alert>

        <v-select
          v-model="form.subject_type"
          label="Subject Type"
          :items="['MAJOR', 'GENED', 'PE_NSTP']"
          :disabled="locked"
          required
        />

        <v-text-field
          v-model="form.course_code"
          label="Course Code"
          :disabled="locked"
          required
        />

        <v-text-field
          v-model="form.description"
          label="Description"
          :disabled="locked"
          required
        />

        <v-row dense>
          <v-col cols="6">
            <v-select
              v-model="form.year_level"
              label="Year Level"
              :items="[1,2,3,4,5,6]"
              :disabled="locked"
            />
          </v-col>

          <v-col cols="6">
            <v-select
              v-model="form.semester"
              label="Semester"
              :items="[1,2]"
              :disabled="locked"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model.number="form.lec_units"
              type="number"
              label="Lecture Units"
              min="0"
            />
          </v-col>

          <v-col cols="6">
            <v-text-field
              v-model.number="form.lab_units"
              type="number"
              label="Lab Units"
              min="0"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">
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
  curriculumId: string | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void
  (e: "save", payload: any): void
}>()

const form = reactive({
  subject_type: "MAJOR",
  course_code: "",
  description: "",
  year_level: 1,
  semester: 1,
  lec_units: 0,
  lab_units: 0
})

watch(
  () => props.item,
  (val) => {
    if (val) {
      Object.assign(form, {
        subject_type: val.subject_type,
        course_code: val.course_code,
        description: val.description,
        year_level: val.year_level,
        semester: val.semester,
        lec_units: val.lec_units ?? 0,
        lab_units: val.lab_units ?? 0
      })
    } else {
      Object.assign(form, {
        subject_type: "MAJOR",
        course_code: "",
        description: "",
        year_level: 1,
        semester: 1,
        lec_units: 0,
        lab_units: 0
      })
    }
  },
  { immediate: true }
)

const locked = computed(() => false)

const canSave = computed(() =>
  !!props.curriculumId &&
  !!form.course_code &&
  !!form.description &&
  !!form.subject_type
)

function save() {
  if (!props.curriculumId) return
  emit("save", {
    ...form,
    curriculum_id: props.curriculumId
  })
}
</script>
