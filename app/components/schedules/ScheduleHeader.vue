<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  termLocked?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-history'): void
  (e: 'open-notifications'): void
}>()
</script>

<template>
  <div class="schedule-header">
    <div class="left">
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>

      <VChip
        v-if="termLocked"
        color="error"
        size="small"
        class="ml-2"
      >
        Academic Term Locked
      </VChip>
    </div>

    <div class="actions">
      <VBtn
        variant="text"
        icon="mdi-history"
        @click="emit('open-history')"
      />
      <VBtn
        variant="text"
        icon="mdi-bell-outline"
        @click="emit('open-notifications')"
      />
    </div>
  </div>
</template>

<style scoped>
.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.subtitle {
  font-size: 13px;
  color: #666;
}

.actions {
  display: flex;
  gap: 4px;
}
</style>
