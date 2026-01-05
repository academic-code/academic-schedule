<template>
  <v-alert type="warning" class="my-4">
    <ul>
      <li v-if="warnings.unassigned_classes">
        {{ warnings.unassigned_classes }} classes without adviser
      </li>
      <li v-if="warnings.inactive_faculty">
        {{ warnings.inactive_faculty }} inactive faculty
      </li>
      <li v-if="warnings.locked_subjects">
        {{ warnings.locked_subjects }} locked subjects
      </li>
    </ul>
  </v-alert>
</template>

<script setup lang="ts">
defineProps<{ warnings: any }>()
</script>
