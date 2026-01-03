<script setup lang="ts">
import { ref } from 'vue'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

const props = defineProps<{
  modelValue: boolean
  departments: any[]
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const supabase = useSupabase()
const notify = useNotifyStore()

const email = ref('')
const firstName = ref('')
const lastName = ref('')
const middleName = ref('')
const departmentId = ref('')
const loading = ref(false)

const close = () => {
  emit('update:modelValue', false)
  email.value = firstName.value = lastName.value = middleName.value = departmentId.value = ''
}

const submit = async () => {
  if (!email.value || !firstName.value || !lastName.value || !departmentId.value) {
    notify.warning('All required fields must be filled')
    return
  }

  loading.value = true

  const { data: { session } } = await supabase.auth.getSession()

  try {
    await $fetch('/api/admin/create-dean', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`
      },
      body: {
        email: email.value,
        first_name: firstName.value,
        last_name: lastName.value,
        middle_name: middleName.value || null,
        department_id: departmentId.value
      }
    })

    notify.success('Dean invitation sent')
    emit('success')
    close()
  } catch (err: any) {
    notify.error(err?.data?.message || 'Failed to invite dean')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520">
    <v-card class="pa-6">
      <h3 class="text-h6 mb-4">Invite Dean</h3>

      <v-text-field v-model="email" label="Email" variant="outlined" />
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
        class="mt-2"
      />

      <div class="d-flex justify-end mt-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="submit">Send Invite</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
