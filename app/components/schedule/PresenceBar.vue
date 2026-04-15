<!-- app/components/schedule/PresenceBar.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'

type Selection = {
  viewMode: 'CLASS' | 'TEACHER'
  classId: string | null
  teacherId: string | null
  editing: boolean
}

type PresenceMeta = {
  user_id: string
  at: string
  viewMode: Selection['viewMode']
  classId: string | null
  teacherId: string | null
  editing: boolean
}

const props = defineProps<{
  termId: string
  selection: Selection
}>()

const supabase = useSupabase()

const online = ref<PresenceMeta[]>([])
let channel: any = null

// viewer context
const myUserId = ref<string | null>(null)
const myDeptType = ref<'REGULAR' | 'GENED' | 'PE_NSTP'>('REGULAR')

// ===== caches =====
const deanNameMap = ref<Record<string, string>>({}) // dean user_id -> full name
const deanAllowedSet = ref<Set<string>>(new Set())  // dean ids only

const classNameMap = ref<Record<string, string>>({})   // class_id -> label
const teacherNameMap = ref<Record<string, string>>({}) // faculty_id -> label

function buildListFromState(state: any): PresenceMeta[] {
  const list: PresenceMeta[] = []

  Object.entries(state || {}).forEach(([_, presences]: any) => {
    const meta = presences?.[0] as PresenceMeta | undefined
    if (meta?.user_id) list.push(meta)
  })

  // latest activity first
  list.sort((a, b) => (a.at < b.at ? 1 : -1))
  return list.slice(0, 10)
}

async function hydrateViewer(uid: string) {
  myUserId.value = uid

  const { data: me, error: meErr } = await supabase
    .from('users')
    .select('department_id')
    .eq('id', uid)
    .single()

  if (meErr || !me?.department_id) return

  const { data: dept, error: deptErr } = await supabase
    .from('departments')
    .select('department_type')
    .eq('id', me.department_id)
    .single()

  if (deptErr) return
  myDeptType.value = (dept?.department_type ?? 'REGULAR')
}

async function hydrateDeans(userIds: string[]) {
  const missing = userIds.filter((id) => !deanNameMap.value[id] && !deanAllowedSet.value.has(id))
  if (!missing.length) return

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .in('id', missing)

  if (error) {
    console.warn('PresenceBar dean lookup failed:', error.message)
    return
  }

  for (const u of data ?? []) {
    if (u.role === 'DEAN') {
      deanAllowedSet.value.add(u.id)
      const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
      deanNameMap.value[u.id] = full || `${u.id.slice(0, 6)}…`
    }
  }
}

async function hydrateClassLabels(classIds: string[]) {
  const ids = classIds.filter(Boolean) as string[]
  const missing = ids.filter((id) => !classNameMap.value[id])
  if (!missing.length) return

  const { data, error } = await supabase
    .from('classes')
    .select('id, program, year_level, section')
    .in('id', missing)

  if (error) {
    console.warn('PresenceBar class lookup failed:', error.message)
    return
  }

  for (const c of data ?? []) {
    classNameMap.value[c.id] = `${c.program} ${c.year_level} - ${c.section}`
  }
}

async function hydrateTeacherLabels(facultyIds: string[]) {
  const ids = facultyIds.filter(Boolean) as string[]
  const missing = ids.filter((id) => !teacherNameMap.value[id])
  if (!missing.length) return

  const { data, error } = await supabase
    .from('faculty')
    .select('id, first_name, last_name, middle_name')
    .in('id', missing)

  if (error) {
    console.warn('PresenceBar faculty lookup failed:', error.message)
    return
  }

  for (const f of data ?? []) {
    const full = `${f.last_name}, ${f.first_name}${f.middle_name ? ' ' + f.middle_name : ''}`
    teacherNameMap.value[f.id] = full
  }
}

function rebuildOnline() {
  if (!channel) return

  const list = buildListFromState(channel.presenceState())
  online.value = list

  // dean-only filtering (UI)
  hydrateDeans(list.map((x) => x.user_id))

  // hydrate class/teacher labels for subtitles
  hydrateClassLabels(list.map((x) => x.classId).filter(Boolean) as string[])
  hydrateTeacherLabels(list.map((x) => x.teacherId).filter(Boolean) as string[])
}

async function trackSelf(uid: string) {
  if (!channel) return
  await channel.track({
    user_id: uid,
    at: new Date().toISOString(),
    viewMode: props.selection.viewMode,
    classId: props.selection.classId,
    teacherId: props.selection.teacherId,
    editing: props.selection.editing
  } satisfies PresenceMeta)
}

async function join() {
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) return

  await hydrateViewer(uid)

  channel = supabase.channel(`presence:schedules:${props.termId}`, {
    config: { presence: { key: uid } }
  })

  channel
    .on('presence', { event: 'sync' }, rebuildOnline)
    .on('presence', { event: 'join' }, rebuildOnline)
    .on('presence', { event: 'leave' }, rebuildOnline)

  await channel.subscribe(async (status: string) => {
    if (status === 'SUBSCRIBED') {
      await trackSelf(uid)
      rebuildOnline()
    }
  })
}

async function leave() {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
  online.value = []
}

// =====================
// Display rules
// =====================
// Your requested behavior:
// - Only DEANS show in UI.
// - REGULAR dean sees other DEANS with details.
// - GENED/PE sees details for everyone (still dean-only in UI).
// - You always see your own details.
// => Since UI is dean-only, everyone in list is a dean; still keep rule function for safety.

const canSeeDetails = (rowUserId: string) => {
  if (rowUserId === myUserId.value) return true
  if (myDeptType.value === 'GENED' || myDeptType.value === 'PE_NSTP') return true
  // REGULAR dean: show details for other deans too
  return true
}

const deansOnline = computed(() =>
  online.value.filter(p => deanAllowedSet.value.has(p.user_id)).slice(0, 10)
)

function displayDeanName(userId: string) {
  return deanNameMap.value[userId] || `${userId.slice(0, 6)}…`
}

function displayClass(classId: string | null) {
  if (!classId) return null
  return classNameMap.value[classId] || `${classId.slice(0, 6)}…`
}

// ✅ IMPORTANT: if teacher name isn't found, HIDE (no fallback to ID)
function displayTeacher(teacherId: string | null) {
  if (!teacherId) return null
  return teacherNameMap.value[teacherId] ?? null
}

// lifecycle
onMounted(join)

watch(
  () => props.selection,
  async () => {
    if (!channel) return
    const { data } = await supabase.auth.getUser()
    const uid = data.user?.id
    if (!uid) return
    await trackSelf(uid)
  },
  { deep: true }
)

watch(
  () => props.termId,
  async () => {
    await leave()
    await join()
  }
)

onBeforeUnmount(leave)
</script>

<template>
  <div class="panel">
    <div class="title">Online now</div>

    <div v-if="!deansOnline.length" class="empty">
      No deans online
    </div>

    <div class="list" v-else>
      <div v-for="p in deansOnline" :key="p.user_id" class="row">
        <div class="dot" :class="{ editing: p.editing }"></div>

        <div class="meta">
          <div class="line">
            {{ displayDeanName(p.user_id) }} • {{ p.viewMode }}
            <span v-if="p.editing" class="badge">editing</span>
          </div>

          <div class="sub">
            <!-- Show details only if allowed by rule -->
            <template v-if="canSeeDetails(p.user_id)">
              <template v-if="p.classId && displayClass(p.classId)">
                Class: {{ displayClass(p.classId) }}
              </template>

              <template v-else-if="p.teacherId && displayTeacher(p.teacherId)">
                Teacher: {{ displayTeacher(p.teacherId) }}
              </template>

              <template v-else>
                Browsing
              </template>
            </template>

            <template v-else>
              Browsing
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* fixed card height so it never grows */
.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  height: 120px;              /* ✅ fixed height */
  display: flex;
  flex-direction: column;
}

.title {
  font-weight: 500;
  font-size: 20px;
  margin-bottom: 12px;
}

/* ✅ scroll kicks in around 3+ rows because this height fits ~2 rows */
.list {
  flex: 1;
  overflow-y: auto;
  padding-right: 6px;
  max-height: 60px;          /* ✅ force scroll sooner */
  overscroll-behavior: contain;
}

.row {
  display: flex;
  gap: 12px;
  padding: 12px 4px;
  border-top: 1px solid #eef2f7;
}
.row:first-of-type { border-top: none; }

.dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #22c55e;
  margin-top: 6px;
  flex: 0 0 auto;
}
.dot.editing { 
  background: #f59e0b; 
  padding: 10px;
}

.meta .line { font-size: 10px; font-weight: 900; }
.meta .sub  { font-size: 9px; color: #64748b; margin-top: 6px; }

.badge {
  margin-left: 8px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  font-weight: 800;
}

.empty {
  font-size: 14px;
  color: #64748b;
}
</style>