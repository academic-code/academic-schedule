<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

type RoomEditData = {
  id: string
  name: string
  room_type: 'LECTURE' | 'LAB' | 'ONLINE'
  capacity: number | null
  is_active?: boolean
}

const props = defineProps<{
  modelValue: boolean
  editData?: RoomEditData | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const supabase = useSupabase()
const notify = useNotifyStore()

const name = ref('')
const roomType = ref<'LECTURE' | 'LAB' | 'ONLINE' | ''>('')
const capacity = ref<number | null>(null)
const loading = ref(false)

const isEditMode = computed(() => !!props.editData)

const roomTypeOptions = [
  { title: 'Lecture', value: 'LECTURE' },
  { title: 'Laboratory', value: 'LAB' },
  { title: 'Online', value: 'ONLINE' }
]

const resetForm = () => {
  name.value = ''
  roomType.value = ''
  capacity.value = null
}

watch(
  () => [props.modelValue, props.editData] as const,
  ([open]) => {
    if (!open) {
      resetForm()
      return
    }

    if (props.editData) {
      name.value = props.editData.name ?? ''
      roomType.value = props.editData.room_type ?? ''
      capacity.value = props.editData.capacity ?? null
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

const close = () => {
  if (loading.value) return
  resetForm()
  emit('update:modelValue', false)
}

const validate = () => {
  if (!name.value.trim() || !roomType.value) {
    notify.warning('Room name and type are required')
    return false
  }

  if (capacity.value !== null && capacity.value < 0) {
    notify.warning('Capacity cannot be negative')
    return false
  }

  return true
}

const submit = async () => {
  if (!validate()) return

  loading.value = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      throw new Error('No active session')
    }

    const payload = {
      name: name.value.trim(),
      room_type: roomType.value,
      capacity: capacity.value
    }

    if (isEditMode.value && props.editData) {
      await $fetch('/api/admin/update-room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          id: props.editData.id,
          ...payload
        }
      })

      notify.success('Room updated successfully')
    } else {
      await $fetch('/api/admin/create-room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      })

      notify.success('Room created successfully')
    }

    resetForm()
    emit('update:modelValue', false)
    emit('success')
  } catch (err: any) {
    notify.error(
      err?.data?.message ||
      err?.message ||
      'Operation failed'
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">
        {{ isEditMode ? 'Update Room' : 'Create Room' }}
      </h3>

      <v-text-field
        v-model="name"
        label="Room Name"
        variant="outlined"
        class="mb-2"
      />

      <v-select
        v-model="roomType"
        :items="roomTypeOptions"
        item-title="title"
        item-value="value"
        label="Room Type"
        variant="outlined"
        class="mb-2"
      />

      <v-text-field
        v-model.number="capacity"
        label="Capacity (optional)"
        type="number"
        variant="outlined"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" :disabled="loading" @click="close">
          Cancel
        </v-btn>

        <v-btn color="primary" :loading="loading" :disabled="loading" @click="submit">
          {{ isEditMode ? 'Update' : 'Create' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>