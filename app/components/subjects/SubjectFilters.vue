<template>
  <v-card elevation="0" class="mb-4 pa-4 rounded-lg">
    <v-row dense>
      <!-- SEARCH -->
      <v-col cols="12">
        <v-text-field
          v-model="filters.search"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          prepend-inner-icon="mdi-magnify"
          placeholder="Search by subject code or description"
          hide-details
        />
      </v-col>

      <!-- PROGRAM -->
      <v-col cols="3">
        <v-select
          v-model="filters.program"
          :items="programOptions"
          item-title="label"
          item-value="value"
          label="Program"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          prepend-inner-icon="mdi-school"
          hide-details
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
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          prepend-inner-icon="mdi-book-open-variant"
          :disabled="!filters.program"
          hide-details
        />
      </v-col>

      <!-- YEAR LEVEL -->
      <v-col cols="3">
        <v-select
          v-model="filters.year_level"
          :items="[1, 2, 3, 4]"
          label="Year Level"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          prepend-inner-icon="mdi-numeric"
          hide-details
        />
      </v-col>

      <!-- SEMESTER -->
      <v-col cols="3">
        <v-select
          v-model="filters.semester"
          :items="[1, 2, 3]"
          label="Semester"
          variant="outlined"
          density="comfortable"
          rounded="lg"
          clearable
          prepend-inner-icon="mdi-calendar"
          hide-details
        />
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed, watch } from "vue"

const props = defineProps<{
  filters: {
    program: string | null
    curriculum_id: string | null
    year_level: number | null
    semester: number | null
    search?: string | null
  }
  curriculums: {
    id: string
    program: string
    curriculum_code: string
  }[]
}>()

/* ===== PROGRAM OPTIONS ===== */
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

/* ===== AUTO-CLEAR CURRICULUM WHEN PROGRAM CHANGES ===== */
watch(
  () => props.filters.program,
  () => {
    props.filters.curriculum_id = null
  }
)
</script>
