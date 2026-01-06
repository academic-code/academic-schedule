<template>
  <v-row dense>
    <v-col cols="4">
      <v-select
        v-model="filters.curriculum_id"
        :items="curriculums"
        item-title="curriculum_code"
        item-value="id"
        label="Curriculum"
        clearable
      />
    </v-col>

    <v-col cols="4">
      <v-select
        v-model="filters.year_level"
        :items="[1,2,3,4,5]"
        label="Year Level"
        clearable
      />
    </v-col>

    <v-col cols="4">
      <v-select
        v-model="filters.semester"
        :items="[1,2,3]"
        label="Semester"
        clearable
      />
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
defineProps<{
  filters: any
  curriculums: any[]
}>()
</script>
