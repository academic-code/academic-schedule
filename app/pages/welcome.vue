<template>
  <v-container class="d-flex justify-center align-center" style="height: 100vh;">
    <v-card width="420" class="pa-6">

      <h2 class="text-h6 text-center mb-4">
        Activate Your Account
      </h2>

      <!-- Missing or invalid token -->
      <v-alert
        v-if="!hasValidToken"
        type="error"
        class="mb-4"
      >
        Invalid or missing activation link.
      </v-alert>

      <!-- Password Setup Form -->
      <div v-else>
        <p class="text-body-2 mb-4">
          Please create your password to complete your account activation.
        </p>

        <v-text-field
          v-model="password"
          label="New Password"
          type="password"
          prepend-icon="mdi-lock"
          class="mb-3"
        />

        <v-text-field
          v-model="confirmPassword"
          label="Confirm Password"
          type="password"
          prepend-icon="mdi-lock-check"
          class="mb-3"
        />

        <v-alert
          v-if="errorMessage"
          type="error"
          class="my-3"
        >
          {{ errorMessage }}
        </v-alert>

        <v-btn
          color="primary"
          block
          :loading="loading"
          @click="submitPassword"
        >
          Set Password
        </v-btn>
      </div>

    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSupabase } from '~/composables/useSupabase'
import { loadUser, currentRole } from '~/composables/useUser'

const router = useRouter()
const route = useRoute()
const supabase = useSupabase()

// form
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)

// tokens
const token = ref<string | null>(null)
const type = ref<string | null>(null)
const hasValidToken = ref(false)

// Load token from URL
onMounted(() => {
  token.value = (route.query.token as string) || null
  type.value = (route.query.type as string) || null

  // Only allow invite or recovery tokens
  if (token.value && (type.value === "invite" || type.value === "recovery")) {
    hasValidToken.value = true
  }
})

/* ---------------------------------------------------------
   SUBMIT PASSWORD
--------------------------------------------------------- */
async function submitPassword() {
  errorMessage.value = ''

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = 'Both password fields are required.'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  loading.value = true

  // Step 1: Update password (Supabase reads token automatically)
  const { error } = await supabase.auth.updateUser({
    password: password.value
  })

  if (error) {
    errorMessage.value = error.message
    loading.value = false
    return
  }

  // Step 2: Get email from query, login automatically
  const email = route.query.email as string | undefined

  if (email) {
    await supabase.auth.signInWithPassword({
      email,
      password: password.value
    })
  }

  // Step 3: Load user metadata to redirect properly
  await loadUser()

  if (currentRole.value === 'ADMIN')
    return router.push('/admin/dashboard')

  if (currentRole.value === 'DEAN')
    return router.push('/dean/dashboard')

  if (currentRole.value === 'FACULTY')
    return router.push('/faculty/schedule')

  // fallback
  router.push('/login')
}
</script>
