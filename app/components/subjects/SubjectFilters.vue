<template>
  <v-card elevation="0" class="mb-4 pa-3">
    <v-row dense>
      <!-- PROGRAM -->
      <v-col cols="3">
        <v-select
          v-model="filters.program"
          :items="programOptions"
          item-title="label"
          item-value="value"
          label="Program"
          clearable
        />
      </v-col>

      <!-- CURRICULUM -->
      <v-col cols="3">
        <v-select
          v-model="filters.curriculum_id"
          :items="filteredCurriculums"
          item-title="curriculum_code"
          item-value="id"
          label="Curriculum"
          clearable
          :disabled="!filters.program"
        />
      </v-col>

      <!-- YEAR LEVEL -->
      <v-col cols="3">
        <v-select
          v-model="filters.year_level"
          :items="[1, 2, 3, 4]"
          label="Year Level"
          clearable
        />
      </v-col>

      <!-- SEMESTER -->
      <v-col cols="3">
        <v-select
          v-model="filters.semester"
          :items="[1, 2, 3]"
          label="Semester"
          clearable
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  filters: {
    program: string | null
    curriculum_id: string | null
    year_level: number | null
    semester: number | null
  }
  curriculums: {
    id: string
    program: string
    curriculum_code: string
  }[]
}>()

/* ===== PROGRAM OPTIONS (SAFE FOR V-SELECT) ===== */
const programOptions = computed(() => {
  const unique = Array.from(
    new Set(props.curriculums.map(c => c.program))
  )

  return unique.map(p => ({
    label: p,
    value: p
  }))
})

/* ===== FILTER CURRICULUM BY PROGRAM ===== */
const filteredCurriculums = computed(() => {
  if (!props.filters.program) return []
  return props.curriculums.filter(
    c => c.program === props.filters.program
  )
})
</script>
