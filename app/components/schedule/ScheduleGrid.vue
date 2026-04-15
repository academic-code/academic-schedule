<!-- app/components/schedule/ScheduleGrid.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import ScheduleCell from './ScheduleCell.vue'
import type { WeekDay, ViewMode, ScheduleRow } from '@/stores/useScheduleStore'

const props = defineProps<{
  days: WeekDay[]
  periods: any[]
  schedules: ScheduleRow[]
  classes: any[]
  termId: string
  termLocked: boolean
  termSemester: 1 | 2 | 3
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
}>()

const activeCell = ref<string | null>(null)

const activeCellKey = computed(() => activeCell.value)

const periodIndexMap = computed(() => {
  return Object.fromEntries((props.periods ?? []).map((p: any, idx: number) => [p.id, idx]))
})

function openEditor(key: string) {
  activeCell.value = key
}
function closeEditor() {
  activeCell.value = null
}
</script>

<template>
  <div class="grid">
    <div class="header">
      <div class="hcell period">Period</div>
      <div v-for="d in days" :key="d" class="hcell">{{ d }}</div>
    </div>

    <div v-for="p in periods" :key="p.id" class="row">
      <div class="pcell">
        {{ p.start_time }} - {{ p.end_time }}
      </div>

      <ScheduleCell
        v-for="d in days"
        :key="`${p.id}:${d}`"
        :day="d"
        :periodId="p.id"
        :periodIndexMap="periodIndexMap"
        :schedules="schedules"

        :classes="classes"

        :termId="termId"
        :termLocked="termLocked"
        :termSemester="termSemester"

        :editMode="editMode"
        :viewMode="viewMode"
        :selectedClassId="selectedClassId"
        :selectedTeacherId="selectedTeacherId"
        :selectedClassMeta="selectedClassMeta"
        :myDeptId="myDeptId"
        :myDeptType="myDeptType"

        :subjects="subjects"
        :faculty="faculty"
        :rooms="rooms"

        :activeCell="activeCellKey"
        @open="openEditor"
        @close="closeEditor"
      />
    </div>
  </div>
</template>

<style scoped>
.grid {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}
.header {
  display: grid;
  grid-template-columns: 160px repeat(6, 1fr);
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}
.hcell {
  padding: 10px;
  font-weight: 700;
  font-size: 12px;
  text-align: center;
}
.hcell.period { text-align: left; }
.row {
  display: grid;
  grid-template-columns: 160px repeat(6, 1fr);
  border-bottom: 1px solid #f1f5f9;
}
.pcell {
  padding: 10px;
  font-size: 12px;
  font-weight: 600;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
}
</style>