<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useScheduleStore } from '@/stores/useScheduleStore'

import ScheduleHeader from '@/components/schedules/ScheduleHeader.vue'
import ScheduleHistoryDrawer from '@/components/schedules/ScheduleHistoryDrawer.vue'
import ScheduleNotifications from '@/components/schedules/ScheduleNotifications.vue'
import TimetableGrid from '@/components/timetable/TimetableGrid.vue'


type FacultyType = 'FULL_TIME' | 'PART_TIME'


/* ================================
 * CLASS FILTER STATE
 * ================================ */
const filterProgram = ref<string | null>(null)
const filterYear = ref<number | null>(null)
const filterAdviser = ref<'WITH' | 'WITHOUT' | null>(null)

const programOptions = computed(() =>
  [...new Set(classes.value.map(c => c.program))].sort()
)

const yearOptions = computed(() =>
  [...new Set(classes.value.map(c => c.year_level))].sort()
)




/* ================================
 * DEPENDENCIES
 * ================================ */
const supabase = useSupabase()
const scheduleStore = useScheduleStore()

/* ================================
 * VIEW MODE
 * ================================ */
const viewMode = ref<'CLASS' | 'TEACHER'>('CLASS')
const editMode = ref(false)

/* ================================
 * SELECTION STATE
 * ================================ */
const selectedClassId = ref<string | null>(null)
const selectedTeacherId = ref<string | null>(null)

/* ================================
 * DATA SOURCES
 * ================================ */
const classes = ref<any[]>([])
const faculty = ref<any[]>([])
const periods = ref<{ id: string; label: string }[]>([])

/* ================================
 * CONTEXT STATE
 * ================================ */
const academicTermId = ref<string | null>(null)
const departmentId = ref<string | null>(null)
const departmentType = ref<'REGULAR' | 'GENED' | 'PE_NSTP'>('REGULAR')
const termLocked = ref(false)

/* ================================
 * UI STATE
 * ================================ */
const showHistory = ref(false)
const showNotifications = ref(false)

/* ================================
 * LOAD BOOTSTRAP DATA
 * ================================ */
onMounted(async () => {
  /* 1️⃣ ACTIVE ACADEMIC TERM */
  const { data: term } = await supabase
    .from('academic_terms')
    .select('id, is_locked')
    .eq('is_active', true)
    .single()

  if (!term) return

  const termId = term.id
  academicTermId.value = termId
  termLocked.value = term.is_locked

  /* 2️⃣ CURRENT USER */
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return

  /* 3️⃣ USER DEPARTMENT */
  const { data: profile } = await supabase
    .from('users')
    .select('department_id')
    .eq('id', auth.user.id)
    .single()

  if (!profile?.department_id) return

  const deptId = profile.department_id
  departmentId.value = deptId

  /* 4️⃣ DEPARTMENT TYPE */
  const { data: dept } = await supabase
    .from('departments')
    .select('department_type')
    .eq('id', deptId)
    .single()

  departmentType.value = dept?.department_type ?? 'REGULAR'

  /* 5️⃣ LOAD REFERENCE DATA */
  const [c, f, p] = await Promise.all([
   supabase
  .from('classes')
  .select(`
    *,
    adviser:faculty (
      first_name,
      last_name
    )
  `)
  .eq('department_id', deptId)
  .order('year_level'),

    supabase
      .from('faculty')
      .select('*')
      .eq('department_id', deptId)
      .eq('is_active', true)
      .order('last_name'),

    supabase
      .from('periods')
      .select('*')
      .order('slot_index')
  ])

  classes.value = c.data ?? []
  faculty.value = f.data ?? []
  periods.value =
    (p.data ?? []).map(pr => ({
      id: pr.id,
      label: `${pr.start_time} - ${pr.end_time}`
    }))

  /* 6️⃣ FETCH SCHEDULES + REALTIME */
  await scheduleStore.fetchSchedules(termId)
})

/* ================================
 * RESET SELECTION ON TOGGLE
 * ================================ */
watch(viewMode, () => {
  selectedClassId.value = null
  selectedTeacherId.value = null
})

watch(
  [viewMode, selectedClassId, selectedTeacherId],
  () => {
    if (editMode.value && !canEdit.value) {
      editMode.value = false
    }
  }
)


/* ================================
 * COMPUTED GUARDS
 * ================================ */
const canRenderGrid = computed(() => {
  if (!academicTermId.value || !departmentId.value) return false
  return viewMode.value === 'CLASS'
    ? Boolean(selectedClassId.value)
    : Boolean(selectedTeacherId.value)
})

const pageTitle = computed(() =>
  viewMode.value === 'CLASS' ? 'Class Schedule' : 'Teacher Schedule'
)

const canEdit = computed(() => {
  if (termLocked.value) return false

  return viewMode.value === 'CLASS'
    ? Boolean(selectedClassId.value)
    : Boolean(selectedTeacherId.value)
})

const classOptions = computed(() =>
  classes.value
    .filter(c => {
if (filterProgram.value && c.program !== filterProgram.value) return false
if (filterYear.value && c.year_level !== filterYear.value) return false

if (filterAdviser.value === 'WITH' && !c.adviser) return false
if (filterAdviser.value === 'WITHOUT' && c.adviser) return false

      return true
    })
    .map(c => ({
      id: c.id,
      yearLabel: ordinal(c.year_level),
      label: `${c.program} ${ordinal(c.year_level)} Year - ${c.section}`,
      adviser: c.adviser
        ? `${c.adviser.last_name}, ${c.adviser.first_name}`
        : 'No Assigned Adviser'
    }))
)


function ordinal(n: number) {
  return ['1st','2nd','3rd'][n-1] ?? `${n}th`
}

/* ================================
 * CLASS SEARCH FILTER (PATCH C)
 * ================================ */
const classFilter = (value: string, query: string) =>
  value.toLowerCase().includes(query.toLowerCase())

const teacherOptions = computed<{
  id: string
  label: string
  type: FacultyType
}[]>(() =>
  faculty.value.map(f => ({
    id: f.id,
    label: `${f.last_name}, ${f.first_name}${f.middle_name ? ' ' + f.middle_name : ''}`,
    type: f.faculty_type === 'FULL_TIME'
      ? 'FULL_TIME'
      : 'PART_TIME'
  }))
)

function facultyTypeMeta(type: FacultyType | string) {
  const safeType: FacultyType =
    type === 'FULL_TIME' ? 'FULL_TIME' : 'PART_TIME'

  return safeType === 'FULL_TIME'
    ? {
        label: 'Full Time',
        color: 'success',
        icon: 'mdi-briefcase-check'
      }
    : {
        label: 'Part Time',
        color: 'info',
        icon: 'mdi-briefcase-clock'
      }
}



/* ================================
 * TEACHER FILTER STATE
 * ================================ */
const filterFacultyType = ref<FacultyType | null>(null)

const filteredTeacherOptions = computed(() =>
  teacherOptions.value.filter(t => {
    if (!filterFacultyType.value) return true
    return t.type === filterFacultyType.value
  })
)



const pageSubtitle = computed(() => departmentType.value)
</script>

<template>
  <div class="schedule-page">
    <!-- ================= HEADER ================= -->
    <ScheduleHeader
      :title="pageTitle"
      :subtitle="pageSubtitle"
      :termLocked="termLocked"
      @open-history="showHistory = true"
      @open-notifications="showNotifications = true"
    />

    <!-- ================= CONTROLS ================= -->
    <div class="controls">
      <VBtnToggle
        v-model="viewMode"
        mandatory
        :disabled="editMode"
      >
        <VBtn value="CLASS">Class View</VBtn>
        <VBtn value="TEACHER">Teacher View</VBtn>
      </VBtnToggle>


      <div class="right">
     <VBtn
        v-if="!editMode"
        color="primary"
        variant="outlined"
        :disabled="!canEdit"
        @click="editMode = true"
      >
        Edit Schedule
      </VBtn>


        <VBtn
          v-else
          color="primary"
          variant="outlined"
          @click="editMode = false"
        >
          Exit Edit
        </VBtn>
      </div>
    </div>

    <!-- ================= SELECTORS ================= -->
    <div class="selectors">

      <!-- ================= CLASS TOOLBAR ================= -->
<div v-if="viewMode === 'CLASS'" class="class-toolbar">

  <!-- PRIMARY: CLASS SEARCH -->
  <div class="class-primary-block">
    <div class="primary-label">Select Class</div>

    <VAutocomplete
      v-model="selectedClassId"
      :items="classOptions"
      item-title="label"
      item-value="id"
      placeholder="Search class (Program, Year, Section)"
      clearable
      auto-select-first
      variant="solo-filled"
      density="comfortable"
      prepend-inner-icon="mdi-magnify"
      :menu-props="{ maxHeight: 360 }"
      :disabled="editMode"
      class="class-primary"
    >
      <template #item="{ item, props }">
        <VListItem v-bind="props" :title="undefined" :subtitle="undefined">
          <VListItemTitle class="d-flex align-center gap-2">
            <VChip size="x-small" color="secondary" variant="outlined">
              {{ item.raw.yearLabel }}
            </VChip>
            {{ item.raw.label }}
          </VListItemTitle>
          <VListItemSubtitle>
            Adviser: {{ item.raw.adviser }}
          </VListItemSubtitle>
        </VListItem>
      </template>
    </VAutocomplete>
  </div>

  <!-- CLASS FILTERS -->
  <div class="class-filters-block">
    <div class="filters-label">Filters</div>

    <div class="class-filters">
      <VSelect v-model="filterProgram" :items="programOptions" label="Program"
        clearable density="compact" variant="outlined" :disabled="editMode" />

      <VSelect v-model="filterYear" :items="yearOptions" label="Year"
        clearable density="compact" variant="outlined" :disabled="editMode" />

      <VSelect v-model="filterAdviser"
        :items="[
          { title: 'With Adviser', value: 'WITH' },
          { title: 'Without Adviser', value: 'WITHOUT' }
        ]"
        item-title="title"
        item-value="value"
        label="Adviser"
        clearable
        density="compact"
        variant="outlined"
        :disabled="editMode"
      />
    </div>
  </div>

</div>


<!-- ================= TEACHER TOOLBAR ================= -->
<div v-if="viewMode === 'TEACHER'" class="class-toolbar">

  <!-- PRIMARY: TEACHER SEARCH -->
  <div class="class-primary-block">
    <div class="primary-label">Select Teacher</div>

    <VAutocomplete
      v-model="selectedTeacherId"
      :items="filteredTeacherOptions"
      item-title="label"
      item-value="id"
      placeholder="Search teacher (Last, First, Middle)"
      clearable
      auto-select-first
      variant="solo-filled"
      density="comfortable"
      prepend-inner-icon="mdi-account-search"
      :menu-props="{ maxHeight: 360 }"
      :disabled="editMode"
      class="class-primary"
    >
      <!-- DROPDOWN ITEM -->
      <template #item="{ item, props }">
        <VListItem v-bind="props" :title="undefined" :subtitle="undefined">
          <VListItemTitle class="d-flex align-center gap-2">
            <VIcon size="16">mdi-account</VIcon>
            {{ item.raw.label }}
          </VListItemTitle>

          <VListItemSubtitle class="d-flex align-center gap-2">
            <VIcon
              size="14"
              :color="facultyTypeMeta(item.raw.type).color"
            >
              {{ facultyTypeMeta(item.raw.type).icon }}
            </VIcon>

            <VChip
              size="x-small"
              :color="facultyTypeMeta(item.raw.type).color"
              variant="tonal"
            >
              {{ facultyTypeMeta(item.raw.type).label }}
            </VChip>
          </VListItemSubtitle>
        </VListItem>
      </template>

      <!-- SELECTED VALUE -->
      <template #selection="{ item }">
        <div class="d-flex align-center gap-2">
          <span>{{ item.raw.label }}</span>
          <VChip
            size="x-small"
            :color="facultyTypeMeta(item.raw.type).color"
            variant="tonal"
          >
            {{ facultyTypeMeta(item.raw.type).label }}
          </VChip>
        </div>
      </template>
    </VAutocomplete>
  </div>

  <!-- TEACHER FILTER -->
  <div class="class-filters-block">
    <div class="filters-label">Filters</div>

    <div class="class-filters">
      <VSelect
        v-model="filterFacultyType"
        :items="[
          { title: 'Full Time', value: 'FULL_TIME' },
          { title: 'Part Time', value: 'PART_TIME' }
        ]"
        item-title="title"
        item-value="value"
        label="Faculty Type"
        clearable
        density="compact"
        variant="outlined"
        hide-details
        :disabled="editMode"
      >
  

        <!-- SELECTED VALUE -->
        <template #selection="{ item }">
          <VChip
            size="x-small"
            :color="facultyTypeMeta(item.value).color"
            variant="tonal"
          >
            {{ item.title }}
          </VChip>
        </template>
      </VSelect>
    </div>
  </div>

</div>


    </div>

    <!-- ================= INFO ================= -->
    <VAlert
      v-if="!canRenderGrid"
      type="info"
      variant="tonal"
      class="mt-4"
    >
      Select a {{ viewMode === 'CLASS' ? 'class' : 'teacher' }} to view schedule
    </VAlert>

    <VAlert
  v-if="editMode"
  type="warning"
  variant="tonal"
  density="compact"
  class="mx-4 mt-2"
>
  Editing mode active — finish or exit edit to change view or selection.
</VAlert>


    <!-- ================= GRID ================= -->
    <TimetableGrid
      v-if="canRenderGrid"
      class="mt-4"
      :academicTermId="academicTermId as string"
      :departmentId="departmentId as string"
      :departmentType="departmentType"
      :mode="viewMode"
      :classId="viewMode === 'CLASS' ? selectedClassId ?? undefined : undefined"
      :teacherId="viewMode === 'TEACHER' ? selectedTeacherId ?? undefined : undefined"
      :editMode="editMode"
      :periods="periods"
      :termLocked="termLocked" 
    />

    <!-- ================= DRAWERS ================= -->
    <ScheduleHistoryDrawer
      :open="showHistory"
      @close="showHistory = false"
    />

    <VNavigationDrawer
      location="right"
      width="420"
      v-model="showNotifications"
    >
      <ScheduleNotifications />
    </VNavigationDrawer>
  </div>

</template>

<style scoped>
.schedule-page {
  padding: 0;
}

/* ===== TOP CONTROLS ===== */
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

/* ===== SELECTOR AREA ===== */
.selectors {
  padding: 10px 10px;
}

/* MAIN ROW:
   [ Select Class ]  [ Program | Year | Adviser ] */
.class-toolbar {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) 420px;
  gap: 20px;
  align-items: start;
}

/* PRIMARY CLASS SELECT */
.class-primary {
  max-width: 520px;
}

/* FILTERS */
.class-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 10px;
}


/* PRIMARY BLOCK */
.class-primary-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* PRIMARY LABEL */
.primary-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.04em;
}



/* FILTER BLOCK */
.class-filters-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* FILTER LABEL */
.filters-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280; /* neutral gray */
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* FILTER INPUTS */
.class-filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
  gap: 10px;
}


/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .class-toolbar {
    grid-template-columns: 1fr;
  }

  .class-filters {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

</style>
