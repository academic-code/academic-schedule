<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useScheduleStore } from '@/stores/useScheduleStore'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{ (e:'close'):void }>()

const supabase = useSupabase()
const store = useScheduleStore()

const logs = ref<any[]>([])
const isLoading = ref(false)

onMounted(load)

async function load() {
  isLoading.value = true

  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'SCHEDULE')
    .order('created_at', { ascending: false })
    .limit(50)

  logs.value = data ?? []
  isLoading.value = false
}

async function undo(log: any) {
  await store.undoSchedule(log.id)
  await load()
}
</script>

<template>
  <VNavigationDrawer
    location="right"
    width="420"
    :model-value="open"
    @update:model-value="emit('close')"
  >
    <div class="drawer-header">
      <h3>Schedule History</h3>
      <VBtn icon="mdi-close" variant="text" @click="emit('close')" />
    </div>

    <VProgressLinear v-if="isLoading" indeterminate />

    <VList>
      <VListItem
        v-for="log in logs"
        :key="log.id"
      >
        <VListItemTitle>
          {{ log.action }}
        </VListItemTitle>

        <VListItemSubtitle>
          {{ new Date(log.created_at).toLocaleString() }}
        </VListItemSubtitle>

        <template #append>
          <VBtn
            v-if="log.action === 'ARCHIVE'"
            size="small"
            variant="outlined"
            @click="undo(log)"
          >
            Undo
          </VBtn>
        </template>
      </VListItem>
    </VList>
  </VNavigationDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  border-bottom: 1px solid #ddd;
}
</style>
