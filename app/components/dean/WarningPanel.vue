<template>
  <v-alert type="warning" class="my-4">
    <ul>
      <li v-if="showClasses && warnings.unassigned_classes">
        {{ warnings.unassigned_classes }} classes without adviser
      </li>

      <li v-if="warnings.inactive_faculty">
        {{ warnings.inactive_faculty }} inactive faculty
      </li>

      <li v-if="showSubjects && warnings.locked_subjects">
        {{ warnings.locked_subjects }} locked subjects
      </li>

      <li v-if="!hasAnyWarning">
        No warnings
      </li>
    </ul>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  warnings: any
  departmentType: "REGULAR" | "GENED" | "PE_NSTP"
}>()

const showClasses = computed(() => props.departmentType === "REGULAR")
const showSubjects = computed(() => props.departmentType === "REGULAR")

const hasAnyWarning = computed(() =>
  (showClasses.value && props.warnings.unassigned_classes) ||
  props.warnings.inactive_faculty ||
  (showSubjects.value && props.warnings.locked_subjects)
)
</script>
