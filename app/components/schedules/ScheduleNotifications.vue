<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupabase } from '@/composables/useSupabase'

const supabase = useSupabase()
const notifications = ref<any[]>([])
const isLoading = ref(false)

onMounted(load)

async function load() {
  isLoading.value = true

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)

  notifications.value = data ?? []
  isLoading.value = false
}

async function markRead(n: any) {
  if (n.is_read) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', n.id)

  n.is_read = true
}
</script>

<template>
  <div class="notifications">
    <h3>Schedule Notifications</h3>

    <VProgressLinear v-if="isLoading" indeterminate />

    <VList>
      <VListItem
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n)"
      >
        <VListItemTitle>
          {{ n.title }}
        </VListItemTitle>

        <VListItemSubtitle>
          {{ n.message }}
        </VListItemSubtitle>

        <template #append>
          <VChip
            v-if="!n.is_read"
            color="primary"
            size="x-small"
          >
            New
          </VChip>
        </template>
      </VListItem>
    </VList>
  </div>
</template>

<style scoped>
.notifications {
  padding: 12px;
}
</style>
