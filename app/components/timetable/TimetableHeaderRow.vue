<script setup lang="ts">
import type { WeekDay } from '../../../types/schedule'
defineProps<{ days: WeekDay[] }>()
</script>

<template>
  <div class="header-row">
    <div class="period-col">Period</div>
    <div v-for="d in days" :key="d" class="day-col">
      {{ d }}
    </div>
  </div>
</template>

<style scoped>
.header-row {
  display: grid;
  grid-template-columns: 140px repeat(6, 1fr);
  background: #f5f7fa;
  border-bottom: 1px solid #ddd;
  font-weight: 600;
}
.period-col,
.day-col {
  padding: 10px;
  font-size: 13px;
  text-align: center;
}
</style>
