<template>
  <v-dialog
    :model-value="modelValue"
    max-width="540"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- HEADER -->
      <v-card-title class="font-weight-bold">
        {{ editing ? "Edit Class" : "New Class" }}
      </v-card-title>

      <!-- BODY -->
      <v-card-text class="pt-4">
        <v-text-field
          v-model="form.program"
          label="Program"
          placeholder="e.g. BSIT"
          :disabled="lockedFields"
          required
        />

        <v-text-field
          v-model.number="form.year_level"
          label="Year Level"
          type="number"
          min="1"
          max="6"
          :disabled="lockedFields"
          required
        />

        <v-text-field
          v-model="form.section"
          label="Section"
          placeholder="e.g. A"
          :disabled="lockedFields"
          required
        />

        <!-- Adviser (TS-safe bridge) -->
        <v-select
          v-model="adviserModel"
          label="Adviser"
          :items="advisers"
          item-title="name"
          item-value="id"
          clearable
          :disabled="lockedFields"
          hint="Optional – can be assigned later"
          persistent-hint
        />

        <!-- Remarks (always editable) -->
        <v-text-field
          v-model="form.remarks"
          label="Remarks"
          placeholder="Optional notes"
        />
      </v-card-text>

      <!-- ACTIONS -->
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="emit('update:modelValue', false)"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="savingDisabled"
          @click="save"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, watch, computed, onMounted } from "vue"
import { useFacultyStore } from "@/stores/useFacultyStore"

/* ================= PROPS ================= */

const props = defineProps<{
  modelValue: boolean
  editing: boolean
  item?: any
  isLocked: boolean
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "save", payload: any): void
}>()

/* ================= STORES ================= */

const facultyStore = useFacultyStore()

/* ================= FORM ================= */

const form = reactive({
  program: "",
  year_level: 1,
  section: "",
  adviser_id: null as string | null,
  remarks: ""
})

/* ================= INIT ================= */

onMounted(() => {
  if (!facultyStore.faculty.length) {
    facultyStore.fetchFaculty()
  }
})

/* ================= WATCH ================= */

watch(
  () => props.item,
  (val) => {
    if (val) {
      form.program = val.program
      form.year_level = val.year_level
      form.section = val.section
      form.adviser_id = val.adviser?.id ?? null
      form.remarks = val.remarks ?? ""
    } else {
      form.program = ""
      form.year_level = 1
      form.section = ""
      form.adviser_id = null
      form.remarks = ""
    }
  },
  { immediate: true }
)

/* ================= LOCK RULES ================= */

const lockedFields = computed(
  () => props.isLocked || props.item?.status === "PUBLISHED"
)

/* ================= SAVE GUARD ================= */

const savingDisabled = computed(() =>
  !form.program || !form.section || !form.year_level
)

/* ================= ADVISER MODEL (TS SAFE) ================= */

const adviserModel = computed<string | undefined>({
  get: () => form.adviser_id ?? undefined,
  set: (val) => {
    form.adviser_id = val ?? null
  }
})

/* ================= ADVISERS LIST ================= */
/**
 * ✔ Same department
 * ✔ Active only
 * ✔ Clean display name
 */
const advisers = computed(() =>
  facultyStore.faculty
    .filter(f => f.is_active)
    .map(f => ({
      id: f.id,
      name: `${f.first_name} ${f.last_name}`
    }))
)

/* ================= SAVE ================= */

function save() {
  emit("save", {
    program: form.program,
    year_level: form.year_level,
    section: form.section,
    adviser_id: form.adviser_id,
    remarks: form.remarks
  })
}
</script>

