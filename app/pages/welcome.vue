<template>
  <v-container class="d-flex justify-center align-center" style="height: 100vh;">
    <v-card width="420" class="pa-6">

      <h2 class="text-h6 text-center mb-4">Activate Your Account</h2>

      <!-- INVALID / EXPIRED TOKEN -->
      <v-alert v-if="invalid" type="error" class="mb-4">
        Invalid or expired activation link.
      </v-alert>

      <!-- PASSWORD FORM -->
      <div v-else>
        <p class="text-body-2 mb-4">
          Create your password to complete your account activation.
        </p>

        <v-text-field
          v-model="password"
          type="password"
          label="New Password"
          prepend-icon="mdi-lock"
        />

        <v-text-field
          v-model="confirmPassword"
          type="password"
          label="Confirm Password"
          prepend-icon="mdi-lock-check"
        />

        <v-alert v-if="errorMessage" type="error" class="my-3">
          {{ errorMessage }}
        </v-alert>

        <v-btn color="primary" block :loading="loading" @click="submitPassword">
          Set Password
        </v-btn>
      </div>

    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useSupabase } from "~/composables/useSupabase"

definePageMeta({ layout: false })

const supabase = useSupabase()
const route = useRoute()
const router = useRouter()

const password = ref("")
const confirmPassword = ref("")
const loading = ref(false)
const errorMessage = ref("")
const invalid = ref(false)

function parseHashParams(hash: string): Record<string, string> {
  // remove the "#"
  const clean = hash.startsWith("#") ? hash.substring(1) : hash
  return Object.fromEntries(new URLSearchParams(clean))
}

const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const type = ref<string | null>(null)

onMounted(async () => {
  //
  // 1️⃣ Try normal query params
  //
  accessToken.value =
    (route.query.access_token as string) ||
    (route.query.token as string) ||
    null

  refreshToken.value = (route.query.refresh_token as string) || null
  type.value = (route.query.type as string) || null

  //
  // 2️⃣ If empty → parse hash mode (#access_token=...)
  //
  if (!accessToken.value) {
    const hashParams = parseHashParams(window.location.hash)

    accessToken.value =
      hashParams.access_token ||
      hashParams.token ||
      null

    refreshToken.value = hashParams.refresh_token || null
    type.value = hashParams.type || null
  }

  //
  // 3️⃣ Still missing → invalid link
  //
  if (!accessToken.value || !type.value) {
    invalid.value = true
    return
  }

  //
  // 4️⃣ Exchange the code for a real session
  //
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    String(accessToken.value)
  )

  if (error || !data.session) {
    invalid.value = true
    return
  }
})

async function submitPassword() {
  errorMessage.value = ""

  if (!password.value || !confirmPassword.value) {
    errorMessage.value = "Both passwords are required."
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = "Passwords do not match."
    return
  }

  loading.value = true

  const { error } = await supabase.auth.updateUser({
    password: password.value
  })

  if (error) {
    errorMessage.value = error.message
    loading.value = false
    return
  }

  loading.value = false
  router.push("/login")
}
</script>

