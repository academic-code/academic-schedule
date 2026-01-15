<script setup lang="ts">
import type { WeekDay } from '../../../types/schedule'
import TimetableCell from './TimetableCell.vue'

defineProps<{
  period:{id:string;label:string}
  periodIndex:number
  days:WeekDay[]
  academicTermId:string
  departmentId:string
  departmentType:'REGULAR'|'GENED'|'PE_NSTP'
  mode:'CLASS'|'TEACHER'
  classId?:string
  teacherId?:string
  editMode:boolean
  activeCellKey:string|null
  periodIndexMap:Record<string,number>
  subjectMap:Record<string,string>
  facultyMap:Record<string,string>
  termLocked?: boolean
}>()


defineEmits<{(e:'open-editor',k:string):void;(e:'close-editor'):void}>()
</script>

<template>
  <div class="period-row">
    <div class="period-label">{{ period.label }}</div>

    <TimetableCell
      v-for="day in days"
      :key="day"
      :day="day"
      :periodId="period.id"
      :academicTermId="academicTermId"
      :departmentId="departmentId"
      :departmentType="departmentType"
      :mode="mode"
      :classId="classId"
      :teacherId="teacherId"
      :editMode="editMode"
      :activeCellKey="activeCellKey"
      :periodIndexMap="periodIndexMap"
      :subjectMap="subjectMap"
      :facultyMap="facultyMap"
 :termLocked="termLocked"
  @open-editor="$emit('open-editor',$event)"
  @close-editor="$emit('close-editor')"
    />
  </div>
</template>


<style scoped>
.period-row {
  display: grid;
  grid-template-columns: 140px repeat(6, 1fr);
  border-bottom: 1px solid #eee;
}

.period-label {
  padding: 8px;
  font-size: 13px;
  font-weight: 600;
  background: #fafafa;
  border-right: 1px solid #ddd;
}
</style>
