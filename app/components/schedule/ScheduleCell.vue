<!-- app/components/schedule/ScheduleCell.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import ScheduleBlock from './ScheduleBlock.vue'
import ScheduleEditor from './ScheduleEditor.vue'
import type { WeekDay, ViewMode, ScheduleRow } from '@/stores/useScheduleStore'

const props = defineProps<{
  day: WeekDay
  periodId: string
  periodIndexMap: Record<string, number>
  schedules: ScheduleRow[]

  termId: string
  termLocked: boolean
  termSemester: 1 | 2 | 3

  classes: any[]

  editMode: boolean
  viewMode: ViewMode
  selectedClassId: string | null
  selectedTeacherId: string | null
  selectedClassMeta: any | null
  myDeptId: string
  myDeptType: 'REGULAR' | 'GENED' | 'PE_NSTP'

  subjects: any[]
  faculty: any[]
  rooms: any[]

  activeCell: string | null
}>()

const emit = defineEmits<{
  (e: 'open', key: string): void
  (e: 'close'): void
}>()

const cellKey = computed(() => {
  const target = props.viewMode === 'CLASS' ? props.selectedClassId : props.selectedTeacherId
  return `${props.day}:${props.periodId}:${props.viewMode}:${target ?? 'none'}`
})

const schedule = computed(() => {
  return props.schedules.find(s => {
    if (s.day !== props.day) return false

    if (props.viewMode === 'CLASS') {
      if (s.class_id !== props.selectedClassId) return false
    } else {
      if (s.faculty_id !== props.selectedTeacherId) return false
    }

    const start = props.periodIndexMap[s.start_period_id]
    const end = props.periodIndexMap[s.end_period_id]
    const cur = props.periodIndexMap[props.periodId]
    if (start === undefined || end === undefined || cur === undefined) return false
    return cur >= start && cur <= end
  })
})

const isStart = computed(() => schedule.value?.start_period_id === props.periodId)
const isEditorOpen = computed(() => props.activeCell === cellKey.value)

function open() {
  if (!props.editMode || props.termLocked) return
  if (!schedule.value || isStart.value) emit('open', cellKey.value)
}
</script>

<template>
 <div class="cell" @click="open">
    <ScheduleBlock
      v-if="schedule && isStart && !isEditorOpen"
      :schedule="schedule"
      :periodIndexMap="periodIndexMap"
      :subjects="subjects"
      :faculty="faculty"
      :editable="editMode && !termLocked"
    />

    <div v-else-if="!schedule && editMode && !isEditorOpen && !termLocked" class="empty">
      + Add
    </div>

    <ScheduleEditor
      v-if="isEditorOpen"
      :day="day"
      :startPeriodId="periodId"
      :termId="termId"
      :termLocked="termLocked"
      :termSemester="termSemester"
      :classes="classes"
      :myDeptId="myDeptId"
      :myDeptType="myDeptType"
      :viewMode="viewMode"
      :selectedClassId="selectedClassId"
      :selectedTeacherId="selectedTeacherId"
      :selectedClassMeta="selectedClassMeta"
      :existing="isStart ? schedule : null"
      :subjects="subjects"
      :faculty="faculty"
      :rooms="rooms"
      :periodIndexMap="periodIndexMap"
      @close="emit('close')"
      @saved="emit('close')"
    />
  </div>
</template>

<style scoped>
.cell {
  min-height: 64px;
  border-right: 1px solid #f1f5f9;
  position: relative;
  padding: 6px;
}
.empty {
  height: 52px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #64748b;
}
</style>