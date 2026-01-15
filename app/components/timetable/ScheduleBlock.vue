<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  schedule: any
  editable: boolean
  periodSlots: number
  subjectMap: Record<string, string>
  facultyMap: Record<string, string>
}>()


const emit = defineEmits<{ (e: 'edit'): void }>()

const style = computed(() => ({
  height: `${props.periodSlots * 64}px`
}))

const subjectLabel = computed(() =>
  props.subjectMap[props.schedule.subject_id] ?? 'Unknown Subject'
)

const facultyLabel = computed(() =>
  props.facultyMap[props.schedule.faculty_id] ?? 'Unassigned'
)

const blockClass = computed(() => ({
  draft: props.schedule.status === 'DRAFT',
  published: props.schedule.status === 'PUBLISHED'
}))

</script>

<template>
  <div class="schedule-block"   :class="blockClass" :style="style">
    <div class="title">{{ subjectLabel }}</div>
    <div class="subtitle">{{ facultyLabel }}</div>
   <div class="mode" :class="schedule.mode.toLowerCase()">
  {{ schedule.mode }}
</div>

   <button
  v-if="editable"
  class="edit-btn"
  title="Edit schedule"
  @click.stop="emit('edit')"
>
  ✎
</button>

  </div>
</template>

<style scoped>
.schedule-block {
  background: linear-gradient(135deg,#e3f2fd,#f1f8ff);
  border: 1px solid #90caf9;
  border-radius: 10px;
  padding: 8px;
  position: relative;
}

/* 🔵 PUBLISHED (default) */
.schedule-block.published {
  opacity: 1;
}

/* 🟡 DRAFT */
.schedule-block.draft {
  background: linear-gradient(135deg,#fff8e1,#fffde7);
  border: 1px dashed #fbc02d;
  opacity: 0.85;
}

.title { font-weight: 600; font-size: 13px; }
.subtitle { font-size: 11px; opacity: .75; }

.mode {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
}

/* Mode colors */
.mode.f2f {
  background: #e3f2fd;
  color: #1565c0;
}

.mode.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.mode.async {
  background: #ede7f6;
  color: #5e35b1;
}


.edit-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
}
</style>
