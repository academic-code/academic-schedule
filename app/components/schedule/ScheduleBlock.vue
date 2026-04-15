<!-- app/components/schedule/ScheduleBlock.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleRow } from '@/stores/useScheduleStore'

const props = defineProps<{
  schedule: ScheduleRow
  periodIndexMap: Record<string, number>
  subjects: any[]
  faculty: any[]
  editable: boolean
}>()

const subjectLabel = computed(() => {
  const s = props.subjects.find((x:any) => x.id === props.schedule.subject_id)
  return s ? s.course_code : 'Unknown'
})

const facultyLabel = computed(() => {
  if (!props.schedule.faculty_id) return 'No faculty'
  const f = props.faculty.find((x:any) => x.id === props.schedule.faculty_id)
  return f ? `${f.last_name}, ${f.first_name}` : 'Unknown'
})

const height = computed(() => {
  const start = props.periodIndexMap[props.schedule.start_period_id] ?? 0
  const end = props.periodIndexMap[props.schedule.end_period_id] ?? start
  const slots = Math.max(1, end - start + 1)
  return `${slots * 64 - 12}px`
})

const cls = computed(() => ({
  draft: props.schedule.status === 'DRAFT'
}))
</script>

<template>
  <div class="block" :class="cls" :style="{ height }">
    <div class="title">{{ subjectLabel }}</div>
    <div class="sub">{{ facultyLabel }}</div>
    <div class="mode">{{ schedule.mode }}</div>
  </div>
</template>

<style scoped>
.block {
  height: 52px;
  border-radius: 10px;
  padding: 8px;
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
  position: relative;
  overflow: hidden;
}
.block.draft {
  background: #fef3c7;
  border: 1px dashed #f59e0b;
  opacity: .9;
}
.title { font-weight: 700; font-size: 12px; }
.sub { font-size: 11px; color: #475569; margin-top: 2px; }
.mode {
  position: absolute;
  right: 8px;
  bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  color: #334155;
}
</style>