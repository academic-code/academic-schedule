<template>
  <v-card elevation="0" class="mb-4 pa-3">
    <v-row dense>
      <!-- SEARCH -->
      <v-col cols="12">
        <v-text-field
          v-model="filters.search"
          label="Search subject (code or description)"
          prepend-inner-icon="mdi-magnify"
          clearable
        />
      </v-col>

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

      <v-col cols="3">
        <v-select
          v-model="filters.year_level"
          :items="[1,2,3,4]"
          label="Year Level"
          clearable
        />
      </v-col>

      <v-col cols="3">
        <v-select
          v-model="filters.semester"
          :items="[1,2,3]"
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
  filters: any
  curriculums: {
    id: string
    program: string
    curriculum_code: string
  }[]
}>()

const programOptions = computed(() => {
  const unique = Array.from(new Set(props.curriculums.map(c => c.program)))
  return unique.map(p => ({ label: p, value: p }))
})

const filteredCurriculums = computed(() => {
  if (!props.filters.program) return []
  return props.curriculums.filter(c => c.program === props.filters.program)
})
</script>
