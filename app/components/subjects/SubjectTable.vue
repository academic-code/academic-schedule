<template>
  <v-data-table :items="items" :loading="loading">
    <template #item.course_code="{ item }">
      <strong>{{ item.course_code }}</strong>
    </template>

    <template #item.curriculum="{ item }">
      {{ item.curriculum?.curriculum_code }}
    </template>

    <template #item.subject_type="{ item }">
      <v-chip size="small">{{ item.subject_type }}</v-chip>
    </template>

    <template #item.actions="{ item }">
      <v-btn icon @click="$emit('edit', item)" :disabled="item.is_locked">
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
      <v-btn icon color="error" @click="$emit('delete', item.id)">
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
defineProps<{ items: any[]; loading: boolean }>()
defineEmits(["edit", "delete"])
</script>
