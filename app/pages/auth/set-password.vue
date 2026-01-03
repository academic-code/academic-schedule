<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'
import { useNotifyStore } from '@/stores/useNotifyStore'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabase()
const router = useRouter()
const notify = useNotifyStore()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const validSession = ref(false)

/**
 * Ensure this page is opened from
 * a valid Supabase invite / reset link
 */
onMounted(async () => {
  const { data } = await supabase.auth.getSession()

  if (!data.session) {
    notify.error('Invalid or expired password setup link')
    router.replace('/login')
    return
  }

  validSession.value = true
})

const setPassword = async () => {
  if (!password.value || password.value.length < 8) {
    notify.warning('Password must be at least 8 characters')
    return
  }

  if (password.value !== confirmPassword.value) {
    notify.warning('Passwords do not match')
    return
  }

  loading.value = true

  const { error } = await supabase.auth.updateUser({
    password: password.value
  })

  loading.value = false

  if (error) {
    notify.error(error.message)
    return
  }

  notify.success('Password set successfully. Please log in.')

  // IMPORTANT: clear session so login is required
  await supabase.auth.signOut()
  router.replace('/login')
}
</script>

<template>
  <div class="auth-container">
    <v-card class="auth-card pa-6" elevation="6" max-width="420">
      <div class="text-center mb-4">
        <img src="/Logo.png" alt="Logo" height="56" class="mb-2" />
        <h2 class="text-h6 font-weight-bold">Set Your Password</h2>
        <p class="text-body-2 text-medium-emphasis">
          Create a password to activate your account
        </p>
      </div>

      <v-form v-if="validSession" @submit.prevent="setPassword">
        <v-text-field
          v-model="password"
          type="password"
          label="New Password"
          variant="outlined"
          prepend-inner-icon="mdi-lock"
          density="comfortable"
          class="mb-3"
          required
        />

        <v-text-field
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          variant="outlined"
          prepend-inner-icon="mdi-lock-check"
          density="comfortable"
          class="mb-4"
          required
        />

        <v-btn
          color="primary"
          block
          size="large"
          :loading="loading"
          type="submit"
        >
          Set Password
        </v-btn>
      </v-form>

      <div v-else class="text-center text-body-2 text-error">
        Invalid or expired link
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fb, #eef2f7);
}

.auth-card {
  width: 100%;
  border-radius: 16px;
}
</style>
