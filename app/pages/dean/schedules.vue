<!-- app/pages/dean/schedules.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useScheduleStore, type ViewMode, type WeekDay } from '@/stores/useScheduleStore'

import ScheduleHeader from '@/components/schedule/ScheduleHeader.vue'
import PresenceBar from '@/components/schedule/PresenceBar.vue'
import ScheduleGrid from '@/components/schedule/ScheduleGrid.vue'

definePageMeta({
  middleware: 'role',
  roles: ['DEAN']
})

const supabase = useSupabase()
const store = useScheduleStore()

const viewMode = ref<ViewMode>('CLASS')
const editMode = ref(false)

const academicTermId = ref<string | null>(null)
const termLocked = ref(false)
const termSemester = ref<1 | 2 | 3>(1)

const myDeptId = ref<string | null>(null)
const myDeptType = ref<'REGULAR' | 'GENED' | 'PE_NSTP'>('REGULAR')

const selectedClassId = ref<string | null>(null)
const selectedTeacherId = ref<string | null>(null)

const periods = ref<any[]>([])
const rooms = ref<any[]>([])
const faculty = ref<any[]>([])
const subjects = ref<any[]>([])
const classes = ref<any[]>([])

const days: WeekDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const safeTermId = computed(() => academicTermId.value ?? '')
const safeDeptId = computed(() => myDeptId.value ?? '')

const canRender = computed(() => {
  if (!academicTermId.value || !myDeptId.value) return false
  return viewMode.value === 'CLASS'
    ? Boolean(selectedClassId.value)
    : Boolean(selectedTeacherId.value)
})

const canEdit = computed(() => !termLocked.value && canRender.value)

const selectionForPresence = computed(() => ({
  viewMode: viewMode.value,
  classId: selectedClassId.value,
  teacherId: selectedTeacherId.value,
  editing: editMode.value
}))

watch(viewMode, () => {
  selectedClassId.value = null
  selectedTeacherId.value = null
  editMode.value = false
})

onMounted(async () => {
  const { data: term } = await supabase
    .from('academic_terms')
    .select('id, is_locked, semester')
    .eq('is_active', true)
    .single()

  if (!term) return

  academicTermId.value = term.id
  termLocked.value = term.is_locked
  termSemester.value = term.semester as 1 | 2 | 3

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return

  const { data: me } = await supabase
    .from('users')
    .select('department_id, role, is_active')
    .eq('id', auth.user.id)
    .single()

  if (!me?.department_id) return

  const deptId = me.department_id as string
  myDeptId.value = deptId

  const { data: dept } = await supabase
    .from('departments')
    .select('department_type')
    .eq('id', deptId)
    .single()

  myDeptType.value = dept?.department_type ?? 'REGULAR'

  const p = await supabase
    .from('periods')
    .select('*')
    .order('slot_index')

  const r = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const f = await supabase
    .from('faculty')
    .select('*')
    .eq('department_id', deptId)
    .eq('is_active', true)
    .order('last_name')

  const subjectType =
    myDeptType.value === 'REGULAR'
      ? 'MAJOR'
      : myDeptType.value === 'GENED'
        ? 'GENED'
        : 'PE_NSTP'

  const s = await supabase
    .from('subjects')
    .select('*')
    .eq('subject_type', subjectType)
    .eq('semester', termSemester.value)
    .eq('is_locked', false)
    .order('course_code')

  const c = myDeptType.value === 'REGULAR'
    ? await supabase
        .from('classes')
        .select('*')
        .eq('department_id', deptId)
        .order('year_level')
        .order('section')
    : await supabase
        .from('classes')
        .select('*')
        .order('year_level')
        .order('section')

  periods.value = p.data ?? []
  rooms.value = r.data ?? []
  faculty.value = f.data ?? []
  subjects.value = s.data ?? []
  classes.value = c.data ?? []

  await store.fetchList(term.id)
})

const classOptions = computed(() =>
  classes.value.map((c: any) => ({
    title: `${c.program} ${c.year_level} - ${c.section}`,
    value: c.id,
    department_id: c.department_id,
    year_level: c.year_level
  }))
)

const teacherOptions = computed(() =>
  faculty.value.map((f: any) => ({
    title: `${f.last_name}, ${f.first_name}${f.middle_name ? ' ' + f.middle_name : ''}`,
    value: f.id
  }))
)

const selectedClassMeta = computed(() =>
  classOptions.value.find(x => x.value === selectedClassId.value)
)
</script>

<template>
  <div>
    <ScheduleHeader
      title="Schedules"
      :termLocked="termLocked"
      :subtitle="`${myDeptType} • ${viewMode}`"
    />

    <div class="topbar">
      <VBtnToggle v-model="viewMode" mandatory :disabled="editMode">
        <VBtn value="CLASS">Class View</VBtn>
        <VBtn value="TEACHER">Teacher View</VBtn>
      </VBtnToggle>

      <div class="right">
        <VBtn
          v-if="!editMode"
          variant="outlined"
          color="primary"
          :disabled="!canEdit"
          @click="editMode = true"
        >
          Edit
        </VBtn>

        <VBtn
          v-else
          variant="outlined"
          color="primary"
          @click="editMode = false"
        >
          Exit Edit
        </VBtn>
      </div>
    </div>

    <div class="main">
      <div class="top-row">
        <PresenceBar
          v-if="academicTermId"
          class="presence-card"
          :termId="safeTermId"
          :selection="selectionForPresence"
        />

        <div class="selector-card">
          <div class="selector-head">
            <div class="selector-title">
              {{ viewMode === 'CLASS' ? 'Select Class' : 'Select Faculty' }}
            </div>
            <div class="selector-hint">
              {{ viewMode === 'CLASS'
                ? 'Choose a class to view & edit the schedule'
                : 'Choose a faculty to view & edit the schedule'
              }}
            </div>
          </div>

          <VAutocomplete
            v-if="viewMode === 'CLASS'"
            v-model="selectedClassId"
            :items="classOptions"
            item-title="title"
            item-value="value"
            placeholder="Search program / year / section"
            prepend-inner-icon="mdi-school"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            :disabled="editMode"
            :menu-props="{ maxHeight: 420 }"
            class="selector-input"
          >
            <template #item="{ item, props }">
              <VListItem v-bind="props" :title="undefined" :subtitle="undefined">
                <VListItemTitle class="d-flex align-center gap-2">
                  <VIcon size="16">mdi-account-group</VIcon>
                  {{ item.raw.title }}
                </VListItemTitle>

              </VListItem>
            </template>
          </VAutocomplete>

          <VAutocomplete
            v-else
            v-model="selectedTeacherId"
            :items="teacherOptions"
            item-title="title"
            item-value="value"
            placeholder="Search last name / first name"
            prepend-inner-icon="mdi-account-search"
            variant="outlined"
            density="comfortable"
            clearable
            hide-details
            :disabled="editMode"
            :menu-props="{ maxHeight: 420 }"
            class="selector-input"
          />
        </div>
      </div>

      <VAlert v-if="!canRender" type="info" variant="tonal" class="mt-4">
        Select a {{ viewMode === 'CLASS' ? 'class' : 'faculty' }} to view schedule.
      </VAlert>

      <VAlert v-if="editMode" type="warning" variant="tonal" density="compact" class="mt-2">
        Editing mode active — exit edit to change view/selection.
      </VAlert>

      <ScheduleGrid
        v-if="canRender && academicTermId && myDeptId"
        class="mt-4"
        :days="days"
        :periods="periods"
        :schedules="store.activeSchedules"
        :classes="classes"
        :termId="safeTermId"
        :termLocked="termLocked"
        :termSemester="termSemester"
        :editMode="editMode"
        :viewMode="viewMode"
        :selectedClassId="selectedClassId"
        :selectedTeacherId="selectedTeacherId"
        :selectedClassMeta="selectedClassMeta"
        :myDeptId="safeDeptId"
        :myDeptType="myDeptType"
        :subjects="subjects"
        :faculty="faculty"
        :rooms="rooms"
      />
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.main {
  padding: 12px;
  background: transparent;
}

.top-row {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 12px;
  align-items: start;
}

.presence-card {
  height: fit-content;
}

.selector-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
}

.selector-head {
  margin-bottom: 10px;
}

.selector-title {
  font-weight: 800;
  font-size: 14px;
}

.selector-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.selector-input :deep(.v-field) {
  border-radius: 12px;
}

.selector-input :deep(input) {
  font-size: 14px;
}

.gap-2 {
  gap: 8px;
}

@media (max-width: 900px) {
  .top-row {
    grid-template-columns: 1fr;
  }
}
</style>