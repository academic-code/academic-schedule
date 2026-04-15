<!-- app/components/schedule/ScheduleHeader.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  termLocked?: boolean
}>()
</script>

<template>
  <div class="header">
    <div>
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="sub">{{ subtitle }}</div>
    </div>

    <VChip v-if="termLocked" color="error" size="small">
      Term Locked
    </VChip>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.title { font-size: 18px; font-weight: 800; }
.sub { font-size: 12px; color: #64748b; margin-top: 2px; }
</style>