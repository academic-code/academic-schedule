<!-- app/components/schedule/ScheduleEditor.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useScheduleStore, type WeekDay, type ScheduleMode } from '@/stores/useScheduleStore'

const props = defineProps<{
  day: WeekDay
  startPeriodId: string
  classes: any[]
  termId: string
  termLocked: boolean
  termSemester: 1 | 2 | 3
  myDeptId: string
  myDeptType: 'REGULAR' | 'GENED' | 'PE_NSTP'
  viewMode: 'CLASS' | 'TEACHER'
  selectedClassId: string | null
  selectedTeacherId: string | null
  selectedClassMeta: any | null
  existing: any | null
  subjects: any[]
  faculty: any[]
  rooms: any[]
  periodIndexMap: Record<string, number>
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const store = useScheduleStore()

const subjectId = ref<string | null>(props.existing?.subject_id ?? null)
const facultyId = ref<string | null>(props.existing?.faculty_id ?? props.selectedTeacherId ?? null)
const roomId = ref<string | null>(props.existing?.room_id ?? null)
const mode = ref<ScheduleMode>(props.existing?.mode ?? 'F2F')

const startPeriodId = ref<string>(props.existing?.start_period_id ?? props.startPeriodId)
const endPeriodId = ref<string>(props.existing?.end_period_id ?? props.startPeriodId)

const classId = ref<string | null>(props.existing?.class_id ?? props.selectedClassId ?? null)

// const classItems = computed(() => [] as { title: string; value: string }[])
const classItems = computed(() =>
  (props.classes ?? []).map((c: any) => ({
    title: `${c.program} ${c.year_level} - ${c.section}`,
    value: c.id,
    department_id: c.department_id,
    year_level: c.year_level
  }))
)

const isSaving = ref(false)
const conflicts = ref<any[]>([])

const periodIdsSorted = computed(() => {
  // from periodIndexMap (already in order)
  return Object.entries(props.periodIndexMap)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id)
})

const endOptions = computed(() => {
  const startIdx = props.periodIndexMap[startPeriodId.value] ?? 0
  return periodIdsSorted.value.filter(id => (props.periodIndexMap[id] ?? 0) >= startIdx)
})

const chosenClassMeta = computed(() => {
  const id = classId.value
  if (!id) return null
  return (props.classes ?? []).find((c: any) => c.id === id) ?? null
})

function buildPayload(status: 'DRAFT' | 'PUBLISHED') {
  // target dept: for REGULAR → same dept
  // for GENED/PE → target dept comes from selected class (the class’s department)
const targetDeptId =
  props.myDeptType === 'REGULAR'
    ? props.myDeptId
    : (chosenClassMeta.value?.department_id ?? props.selectedClassMeta?.department_id ?? props.myDeptId)

  return {
    id: props.existing?.id,
    academic_term_id: props.termId,

    // ownership model
    owner_department_id: props.myDeptId,
    target_department_id: targetDeptId,
    department_id: targetDeptId, // CHECK enforces match

    day: props.day,
    start_period_id: startPeriodId.value,
    end_period_id: endPeriodId.value,

    subject_id: subjectId.value,
    faculty_id: facultyId.value,   // optional
    room_id: roomId.value,         // optional
    mode: mode.value,
    status,

    // class rules
    class_id: classId.value
  }
}

const canSave = computed(() => {
  if (props.termLocked) return false
  if (!subjectId.value) return false
  if (!startPeriodId.value || !endPeriodId.value) return false
  if (startPeriodId.value === endPeriodId.value) return false

  // YOUR RULE: TEACHER view cannot create schedule without class
  if (props.viewMode === 'TEACHER' && !classId.value) return false

  // REGULAR: class must exist in class view (since schedule is for class)
  if (props.viewMode === 'CLASS' && !classId.value) return false

  return true
})

async function save(status: 'DRAFT' | 'PUBLISHED') {
  if (!canSave.value) return
  conflicts.value = []
  isSaving.value = true

  const res = await store.saveSchedule(buildPayload(status))

  if (res?.success === false) {
    conflicts.value = res.conflicts ?? []
    isSaving.value = false
    return
  }

  emit('saved')
  emit('close')
  isSaving.value = false
}

onMounted(() => {
  // If CLASS view, lock classId to selectedClassId
  if (props.viewMode === 'CLASS') {
    classId.value = props.selectedClassId ?? null
  }

  // If TEACHER view and existing schedule has class, keep it.
  // Otherwise leave null until user selects.
})

watch(
  () => props.selectedClassId,
  (v) => {
    if (props.viewMode === 'CLASS') classId.value = v ?? null
  }
)

watch(startPeriodId, (v) => {
  // if current end is no longer valid, reset to start
  if (!endOptions.value.includes(endPeriodId.value)) {
    endPeriodId.value = v
  }
})

</script>

<template>
  <div class="editor">
    <div class="head">
      <div class="title">{{ day }}</div>
      <VBtn icon="mdi-close" variant="text" @click="emit('close')" />
    </div>

    <VAlert v-if="termLocked" type="error" density="compact" class="mb-2">
      Academic term is locked.
    </VAlert>

    <VSelect
  v-if="viewMode === 'TEACHER'"
  v-model="classId"
  :items="classItems"
  item-title="title"
  item-value="value"
  label="Class (required in Faculty view)"
  clearable
  density="comfortable"
/>

    <VSelect
      v-model="subjectId"
      :items="subjects"
      item-title="course_code"
      item-value="id"
      label="Subject"
      density="comfortable"
    />

    <VSelect
      v-model="mode"
      :items="['F2F','ONLINE','ASYNC']"
      label="Mode"
      density="comfortable"
    />

    <VSelect
      v-model="roomId"
      :items="rooms"
      item-title="name"
      item-value="id"
      label="Room (optional)"
      clearable
      density="comfortable"
    />

    <VSelect
      v-model="facultyId"
      :items="faculty"
      item-title="last_name"
      item-value="id"
      label="Faculty (optional)"
      clearable
      density="comfortable"
    />


    <div class="range">
      <VSelect v-model="startPeriodId" :items="periodIdsSorted" label="Start Period Id" density="comfortable" />
      <VSelect v-model="endPeriodId" :items="endOptions" label="End Period Id" density="comfortable" />
    </div>

    <VAlert v-if="conflicts.length" type="error" variant="tonal" class="mt-2">
      Conflict detected. Please change time/faculty/room/class.
    </VAlert>

    <div class="actions">
      <VBtn variant="text" @click="emit('close')">Cancel</VBtn>
      <VBtn variant="outlined" :disabled="!canSave" @click="save('DRAFT')">Save Draft</VBtn>
      <VBtn color="primary" :loading="isSaving" :disabled="!canSave" @click="save('PUBLISHED')">
        Publish
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.editor {
  position: absolute;
  z-index: 30;
  top: 6px;
  left: 6px;
  width: 360px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 18px 44px rgba(0,0,0,.18);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.title { font-weight: 800; }
.range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
</style>