<template>
  <div class="dashboard-hero">
    <div>
      <h1 class="hero-title">
        Welcome,
        <span class="accent">
          {{ dean?.full_name || "Dean" }}
        </span>
      </h1>

      <p class="hero-sub">
        {{ department?.name }} Department ·
        {{ department?.department_type }} ·
        <span v-if="term?.is_active">
          {{ term.academic_year }} – Semester {{ term.semester }}
        </span>
        <span v-else>No Active Term</span>
      </p>
    </div>

    <v-chip color="primary" variant="tonal">
      {{ dean?.email }}
    </v-chip>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dean: any
  department: any
  term: any
}>()
</script>

<style scoped>
.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.hero-title {
  font-size: 1.8rem;
  font-weight: 700;
}
.hero-sub {
  color: #6b7280;
  margin-top: 4px;
}
.accent {
  color: #1976d2;
}
</style>
