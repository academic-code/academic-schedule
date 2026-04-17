<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

type DepartmentOption = {
  id: string
  name: string
  department_type: 'REGULAR' | 'GENED' | 'PE_NSTP'
}

type DeanEditData = {
  id: string
  users: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    middle_name: string | null
    is_active: boolean
    last_login_at: string | null
  }
  departments: {
    id: string
    name: string
    department_type: 'REGULAR' | 'GENED' | 'PE_NSTP'
  }
}

const props = defineProps<{
  modelValue: boolean
  departments: DepartmentOption[]
  editData?: DeanEditData | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const supabase = useSupabase()
const notify = useNotifyStore()

const email = ref('')
const firstName = ref('')
const lastName = ref('')
const middleName = ref('')
const departmentId = ref('')
const loading = ref(false)

const isEditMode = computed(() => !!props.editData)

const resetForm = () => {
  email.value = ''
  firstName.value = ''
  lastName.value = ''
  middleName.value = ''
  departmentId.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) {
      resetForm()
      return
    }

    if (props.editData) {
      email.value = props.editData.users.email ?? ''
      firstName.value = props.editData.users.first_name ?? ''
      lastName.value = props.editData.users.last_name ?? ''
      middleName.value = props.editData.users.middle_name ?? ''
      departmentId.value = props.editData.departments.id ?? ''
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

watch(
  () => props.editData,
  (val) => {
    if (!props.modelValue) return
    if (!val) return

    email.value = val.users.email ?? ''
    firstName.value = val.users.first_name ?? ''
    lastName.value = val.users.last_name ?? ''
    middleName.value = val.users.middle_name ?? ''
    departmentId.value = val.departments.id ?? ''
  }
)

const close = () => {
  if (loading.value) return
  resetForm()
  emit('update:modelValue', false)
}

const validate = () => {
  if (!firstName.value.trim() || !lastName.value.trim() || !departmentId.value) {
    notify.warning('Required fields are missing')
    return false
  }

  if (!isEditMode.value) {
    const trimmedEmail = email.value.trim().toLowerCase()

    if (!trimmedEmail) {
      notify.warning('Email is required')
      return false
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    if (!emailValid) {
      notify.warning('Please enter a valid email address')
      return false
    }
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

    if (isEditMode.value && props.editData) {
      await $fetch('/api/admin/update-dean', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          user_id: props.editData.users.id,
          first_name: firstName.value.trim(),
          last_name: lastName.value.trim(),
          middle_name: middleName.value.trim() || null,
          department_id: departmentId.value
        }
      })

      notify.success('Dean updated successfully')
    } else {
      await $fetch('/api/admin/create-dean', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: {
          email: email.value.trim().toLowerCase(),
          first_name: firstName.value.trim(),
          last_name: lastName.value.trim(),
          middle_name: middleName.value.trim() || null,
          department_id: departmentId.value
        }
      })

      notify.success('Dean invitation sent')
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
    max-width="520"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">
        {{ isEditMode ? 'Update Dean' : 'Invite Dean' }}
      </h3>

      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        variant="outlined"
        :disabled="isEditMode"
        class="mb-2"
      />

      <v-text-field
        v-model="firstName"
        label="First Name"
        variant="outlined"
        class="mb-2"
      />

      <v-text-field
        v-model="lastName"
        label="Last Name"
        variant="outlined"
        class="mb-2"
      />

      <v-text-field
        v-model="middleName"
        label="Middle Name (Optional)"
        variant="outlined"
        class="mb-2"
      />

      <v-select
        v-model="departmentId"
        :items="departments"
        item-title="name"
        item-value="id"
        label="Department"
        variant="outlined"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" :disabled="loading" @click="close">
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          :loading="loading"
          :disabled="loading"
          @click="submit"
        >
          {{ isEditMode ? 'Update' : 'Invite' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>