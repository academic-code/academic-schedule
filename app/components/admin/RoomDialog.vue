<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{
  modelValue: boolean
  editData?: any | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const supabase = useSupabase()
const notify = useNotifyStore()

// ================= STATE =================
const name = ref('')
const roomType = ref('')
const capacity = ref<number | null>(null)
const loading = ref(false)

const isEditMode = computed(() => !!props.editData)

// ================= HELPERS =================
const resetForm = () => {
  name.value = ''
  roomType.value = ''
  capacity.value = null
}

// 🔑 FIXES EDIT / INVITE GLITCH
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    if (props.editData) {
      name.value = props.editData.name
      roomType.value = props.editData.room_type
      capacity.value = props.editData.capacity
    } else {
      resetForm()
    }
  }
)

const close = () => {
  emit('update:modelValue', false)
  resetForm()
}

// ================= SUBMIT =================
const submit = async () => {
  if (!name.value || !roomType.value) {
    notify.warning('Room name and type are required')
    return
  }

  loading.value = true
  const { data: { session } } = await supabase.auth.getSession()

  try {
    if (isEditMode.value) {
      await $fetch('/api/admin/update-room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: {
          id: props.editData.id,
          name: name.value,
          room_type: roomType.value,
          capacity: capacity.value
        }
      })
      notify.success('Room updated successfully')
    } else {
      await $fetch('/api/admin/create-room', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        },
        body: {
          name: name.value,
          room_type: roomType.value,
          capacity: capacity.value
        }
      })
      notify.success('Room created successfully')
    }

    emit('success')
    close()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Operation failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="500">
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">
        {{ isEditMode ? 'Update Room' : 'Create Room' }}
      </h3>

      <v-text-field
        v-model="name"
        label="Room Name"
        variant="outlined"
      />

      <v-select
        v-model="roomType"
        :items="['LECTURE', 'LAB', 'OFFICE', 'OTHER']"
        label="Room Type"
        variant="outlined"
      />

      <v-text-field
        v-model.number="capacity"
        label="Capacity (optional)"
        type="number"
        variant="outlined"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">
          {{ isEditMode ? 'Update' : 'Create' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
