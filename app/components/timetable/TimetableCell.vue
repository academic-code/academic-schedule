<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore } from '@/stores/useScheduleStore'
import ScheduleBlock from './ScheduleBlock.vue'
import InlineScheduleEditor from './InlineScheduleEditor.vue'
import type { WeekDay } from '../../../types/schedule'

const props = defineProps<{
  day: WeekDay
  periodId: string
  academicTermId: string
  departmentId: string
  departmentType: 'REGULAR' | 'GENED' | 'PE_NSTP'
  mode: 'CLASS' | 'TEACHER'
  classId?: string
  teacherId?: string
  editMode: boolean
  activeCellKey: string | null
  periodIndexMap: Record<string, number>
  subjectMap: Record<string, string>
  facultyMap: Record<string, string>
  termLocked?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-editor', key: string): void
  (e: 'close-editor'): void
}>()

const store = useScheduleStore()

/* ================================
 * CELL KEY
 * ================================ */
const cellKey = computed(() =>
  `${props.day}:${props.periodId}:${props.mode}:${props.classId ?? props.teacherId ?? 'none'}`
)

/* ================================
 * FIND SCHEDULE (PUBLISHED)
 * ================================ */
const schedule = computed(() =>
  store.publishedSchedules.find(s => {
    if (s.day !== props.day) return false

    if (props.mode === 'CLASS' && s.class_id !== props.classId) return false
    if (props.mode === 'TEACHER' && s.faculty_id !== props.teacherId) return false

    const start = props.periodIndexMap[s.start_period_id]
    const end = props.periodIndexMap[s.end_period_id]
    const current = props.periodIndexMap[props.periodId]

    if (start === undefined || end === undefined || current === undefined) {
      return false
    }

    return current >= start && current <= end
  })
)

/* ================================
 * START PERIOD ONLY
 * ================================ */
const isStart = computed(
  () => schedule.value?.start_period_id === props.periodId
)

/* ================================
 * EDITOR STATE
 * ================================ */
const isEditorOpen = computed(
  () => props.activeCellKey === cellKey.value
)

/* ================================
 * MULTI-PERIOD HEIGHT
 * ================================ */
const periodSlots = computed(() => {
  if (!schedule.value) return 1

  const start = props.periodIndexMap[schedule.value.start_period_id]
  const end = props.periodIndexMap[schedule.value.end_period_id]

  if (start === undefined || end === undefined) return 1
  return end - start + 1
})

/* ================================
 * ACTIONS
 * ================================ */
function openEditor() {
  if (!props.editMode || !isStart.value || props.termLocked) return
  emit('open-editor', cellKey.value)
}
</script>

<template>
  <div class="timetable-cell">
    <!-- EXISTING SCHEDULE -->
    <ScheduleBlock
      v-if="schedule && isStart && !isEditorOpen"
      :schedule="schedule"
      :editable="editMode && !termLocked"
      :periodSlots="periodSlots"
      :subjectMap="subjectMap"
      :facultyMap="facultyMap"
      @edit="openEditor"
    />

    <!-- EMPTY SLOT -->
<button
  v-else-if="!schedule && editMode && !isEditorOpen && !termLocked"
  class="add-btn"
  @click="openEditor"
>
  + Add from here
</button>


    <!-- INLINE EDITOR -->
    <InlineScheduleEditor
      v-if="isEditorOpen"
      :day="day"
      :startPeriodId="periodId"
      :academicTermId="academicTermId"
      :departmentId="departmentId"
      :departmentType="departmentType"
      :classId="mode === 'CLASS' ? classId : undefined"
      :facultyId="mode === 'TEACHER' ? teacherId : undefined"
      :existingSchedule="schedule"
      :termLocked="termLocked"
      @close="emit('close-editor')"
      @saved="emit('close-editor')"
    />
  </div>
</template>

<style scoped>
.timetable-cell {
  min-height: 64px;
  border-bottom: 1px solid #eee;
  position: relative;
}

.add-btn {
  width: 100%;
  height: 64px;
  border: 1px dashed #ccc;
  background: transparent;
  cursor: pointer;
}
</style>
