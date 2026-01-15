<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { WeekDay } from '../../../types/schedule'
import TimetableHeaderRow from './TimetableHeaderRow.vue'
import TimetablePeriodColumn from './TimetablePeriodColumn.vue'



const props = defineProps<{
  academicTermId: string
  departmentId: string
  departmentType: 'REGULAR' | 'GENED' | 'PE_NSTP'
  mode: 'CLASS' | 'TEACHER'
  classId?: string
  teacherId?: string
  editMode: boolean
  periods: { id: string; label: string }[]
  termLocked: boolean   // 🔒 REQUIRED (STEP 1)
}>()


const supabase = useSupabase()
const activeCellKey = ref<string|null>(null)

const periodIndexMap = computed(() =>
  Object.fromEntries(props.periods.map((p,i)=>[p.id,i]))
)

const subjectMap = ref<Record<string,string>>({})
const facultyMap = ref<Record<string,string>>({})

onMounted(async()=>{
  const [{data:s},{data:f}] = await Promise.all([
    supabase
  .from('subjects')
  .select('id,course_code')
  .eq('department_id', props.departmentId),
  supabase
  .from('faculty')
  .select('id,first_name,last_name')
  .eq('department_id', props.departmentId)

  ])
  subjectMap.value = Object.fromEntries((s??[]).map(x=>[x.id,x.course_code]))
  facultyMap.value = Object.fromEntries((f??[]).map(x=>[x.id,`${x.last_name}, ${x.first_name}`]))
})

const days:WeekDay[]=['MON','TUE','WED','THU','FRI','SAT']
</script>

<template>
  <div class="timetable-grid">
    <TimetableHeaderRow :days="days" />

    <div class="timetable-body">
      <TimetablePeriodColumn
        v-for="(p,i) in periods"
        :key="p.id"
        :period="p"
        :periodIndex="i"
        :days="days"
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
        @open-editor="k=>activeCellKey=k"
        @close-editor="activeCellKey=null"
      />
    </div>
  </div>
</template>


<style scoped>
.timetable-grid {
  width: 100%;
  overflow-x: auto;
}

.timetable-body {
  display: flex;
  flex-direction: column;
}
</style>
