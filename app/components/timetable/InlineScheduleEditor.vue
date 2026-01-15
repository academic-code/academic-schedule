<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useScheduleStore } from '@/stores/useScheduleStore'
import { useSupabase } from '@/composables/useSupabase'
import type { WeekDay, ScheduleMode } from '../../../types/schedule'

/* ===================== PROPS ===================== */
const props = defineProps<{
  day: WeekDay
  startPeriodId: string
  academicTermId: string
  departmentId: string
  departmentType: 'REGULAR' | 'GENED' | 'PE_NSTP'
  classId?: string
  facultyId?: string
  existingSchedule?: any | null
  termLocked?: boolean
}>()

const emit = defineEmits<{ (e:'close'):void; (e:'saved'):void }>()

/* ===================== DEPS ===================== */
const store = useScheduleStore()
const supabase = useSupabase()

/* ===================== STATE ===================== */
const subjectId = ref<string|null>(props.existingSchedule?.subject_id ?? null)
const facultyId = ref<string|null>(props.existingSchedule?.faculty_id ?? props.facultyId ?? null)
const roomId = ref<string|null>(props.existingSchedule?.room_id ?? null)
const mode = ref<ScheduleMode>(props.existingSchedule?.mode ?? 'F2F')

const startPeriodId = ref(props.existingSchedule?.start_period_id ?? props.startPeriodId)
const endPeriodId = ref(props.existingSchedule?.end_period_id ?? props.startPeriodId)

const subjects = ref<any[]>([])
const faculty = ref<any[]>([])
const rooms = ref<any[]>([])
const periods = ref<any[]>([])

const conflicts = ref<any[]>([])
const isSaving = ref(false)

/* ===================== LOAD OPTIONS (FIXED) ===================== */
onMounted(async () => {
  const subjectType =
    props.departmentType === 'REGULAR'
      ? 'MAJOR'
      : props.departmentType

  const [s, f, r, p] = await Promise.all([
supabase
  .from('subjects')
  .select('*')
  .eq('department_id', props.departmentId)
  .eq('subject_type', subjectType)
  .eq('is_locked', false),


supabase
  .from('faculty')
  .select('*')
  .eq('is_active', true)
  .eq('department_id', props.departmentId),


    supabase.from('rooms').select('*').eq('is_active', true),

    supabase.from('periods').select('*').order('slot_index')
  ])

  subjects.value = s.data ?? []
  faculty.value = f.data ?? []
  rooms.value = r.data ?? []
  periods.value = p.data ?? []
})

/* ===================== PERIOD LOGIC ===================== */
const startSlotIndex = computed(() =>
  periods.value.find(p => p.id === startPeriodId.value)?.slot_index ?? 0
)

const endPeriodOptions = computed(() =>
  periods.value.filter(p => p.slot_index >= startSlotIndex.value)
)

watch(startPeriodId, v => {
  if (!endPeriodOptions.value.find(p => p.id === endPeriodId.value)) {
    endPeriodId.value = v
  }
})

/* ===================== VALIDATION ===================== */
const requiresClass = computed(() => props.departmentType === 'REGULAR')

const roomCompatible = computed(() => {
  const room = rooms.value.find(r => r.id === roomId.value)
  if (!room) return true
if (mode.value === 'ONLINE') return room.room_type === 'ONLINE'
if (mode.value === 'ASYNC') return true
if (mode.value === 'F2F') return room.room_type !== 'ONLINE'

  return true
})

const canSave = computed(() =>
  !props.termLocked &&
  Boolean(
    subjectId.value &&
    facultyId.value &&
    roomId.value &&
    roomCompatible.value &&
    (!requiresClass.value || props.classId) &&
    startPeriodId.value &&
    endPeriodId.value &&
    startPeriodId.value !== endPeriodId.value
  )
)

const errorMessage = computed(() => store.lastError)

/* ===================== PAYLOAD ===================== */
function buildPayload(status:'DRAFT'|'PUBLISHED') {
  return {
    id: props.existingSchedule?.id,
    academic_term_id: props.academicTermId,
    department_id: props.departmentId,
    class_id: requiresClass.value ? props.classId! : null,
    subject_id: subjectId.value!,
    faculty_id: facultyId.value!,
    room_id: roomId.value!,
    day: props.day,
    start_period_id: startPeriodId.value,
    end_period_id: endPeriodId.value,
    mode: mode.value,
    status
  }
}

/* ===================== SAVE ===================== */
async function save(status:'DRAFT'|'PUBLISHED') {
  if (!canSave.value) return

  isSaving.value = true
  conflicts.value = []

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
</script>

<template>
  <div class="inline-editor">
    <VAlert v-if="props.termLocked" type="error" density="compact">
      Academic term is locked. Editing disabled.
    </VAlert>

    <VAlert v-if="errorMessage" type="error" density="compact">
      {{ errorMessage }}
    </VAlert>

    <VAlert v-if="!roomCompatible" type="warning" density="compact">
      Room type is not compatible with selected mode.
    </VAlert>

    <VSelect v-model="subjectId" :items="subjects" item-title="course_code" item-value="id" label="Subject" />
    <VSelect v-model="mode" :items="['F2F','ONLINE','ASYNC']" label="Mode" />
    <VSelect v-model="roomId" :items="rooms" item-title="name" item-value="id" label="Room" />
    <VSelect v-model="facultyId" :items="faculty" item-title="last_name" item-value="id" label="Faculty" />

    <div class="period-range">
      <VSelect v-model="startPeriodId" :items="periods" item-title="start_time" item-value="id" label="Start" />
      <VSelect v-model="endPeriodId" :items="endPeriodOptions" item-title="end_time" item-value="id" label="End" />
    </div>

<VAlert v-if="conflicts.length" type="error" density="compact">
  <div class="conflict-title">Scheduling conflict detected:</div>
  <ul class="conflict-list">
    <li v-for="c in conflicts" :key="c.schedule_id">
      Conflicts with an existing published schedule on the same day and time
      (room, faculty, or class already assigned).
    </li>
  </ul>
</VAlert>


    <div class="actions">
      <VBtn variant="text" @click="emit('close')">Cancel</VBtn>
      <VBtn
  variant="outlined"
  :disabled="!canSave || isSaving"
  @click="save('DRAFT')"
>
  Save Draft
</VBtn>

<VBtn
  color="primary"
  :disabled="!canSave"
  :loading="isSaving"
  @click="save('PUBLISHED')"
>
  Publish Schedule
</VBtn>

    </div>
  </div>
</template>

<style scoped>
.inline-editor {
  background:#fff;
  border-radius:12px;
  padding:14px;
  width:360px;
  box-shadow:0 12px 32px rgba(0,0,0,.18);
}
.period-range {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
}
.actions {
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:12px;
}

.conflict-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.conflict-list {
  padding-left: 16px;
  margin: 0;
}

</style>
