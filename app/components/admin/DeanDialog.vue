<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{
  modelValue: boolean
  departments: any[]
  editData?: any | null
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const supabase = useSupabase()
const notify = useNotifyStore()

// ================= FORM STATE =================
const email = ref('')
const firstName = ref('')
const lastName = ref('')
const middleName = ref('')
const departmentId = ref('')
const loading = ref(false)

const isEditMode = computed(() => !!props.editData)

// ================= HELPERS =================
const resetForm = () => {
  email.value = ''
  firstName.value = ''
  lastName.value = ''
  middleName.value = ''
  departmentId.value = ''
}

// 🔑 THIS FIXES THE GLITCH
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return

    if (props.editData) {
      // EDIT MODE
      email.value = props.editData.users.email
      firstName.value = props.editData.users.first_name
      lastName.value = props.editData.users.last_name
      middleName.value = props.editData.users.middle_name
      departmentId.value = props.editData.departments.id
    } else {
      // INVITE MODE
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
  if (!firstName.value || !lastName.value || !departmentId.value) {
    notify.warning('Required fields are missing')
    return
  }

  loading.value = true
  const { data: { session } } = await supabase.auth.getSession()

  try {
    if (isEditMode.value) {
      // UPDATE
      await $fetch('/api/admin/update-dean', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          user_id: props.editData.users.id,
          first_name: firstName.value,
          last_name: lastName.value,
          middle_name: middleName.value || null,
          department_id: departmentId.value
        }
      })
      notify.success('Dean updated successfully')
    } else {
      // INVITE
      await $fetch('/api/admin/create-dean', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          email: email.value,
          first_name: firstName.value,
          last_name: lastName.value,
          middle_name: middleName.value || null,
          department_id: departmentId.value
        }
      })
      notify.success('Dean invitation sent')
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
  <v-dialog :model-value="modelValue" max-width="520">
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">
        {{ isEditMode ? 'Update Dean' : 'Invite Dean' }}
      </h3>

      <v-text-field
        v-model="email"
        label="Email"
        variant="outlined"
        :disabled="isEditMode"
      />

      <v-text-field v-model="firstName" label="First Name" variant="outlined" />
      <v-text-field v-model="lastName" label="Last Name" variant="outlined" />
      <v-text-field v-model="middleName" label="Middle Name (Optional)" variant="outlined" />

      <v-select
        v-model="departmentId"
        :items="departments"
        item-title="name"
        item-value="id"
        label="Department"
        variant="outlined"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">
          {{ isEditMode ? 'Update' : 'Invite' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
