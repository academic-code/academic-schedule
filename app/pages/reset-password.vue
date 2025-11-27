<template>
  <v-container fluid class="page-hero pa-0">
    <div class="hero-gradient" />
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" md="6" lg="4">
        <v-card elevation="12" class="pa-6 auth-card">
          <div class="text-center mb-6">
            <v-img src="/logo.png" max-width="110" class="mx-auto mb-2" />
            <h3 class="mb-1">Set a New Password</h3>
            <div class="text-body-2 text-grey">
              Enter a new password to finish.
            </div>
          </div>

          <v-alert
            v-if="tokenMissing"
            type="error"
            class="mb-4"
            dense
          >
            Invalid or expired reset link.
          </v-alert>

          <v-form
            v-if="!tokenMissing"
            ref="formRef"
            @submit.prevent="onReset"
            v-model="valid"
            lazy-validation
          >
            <v-text-field
              v-model="password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showPassword ? 'text' : 'password'"
              @click:append-inner="() => (showPassword = !showPassword)"
              label="Password"
              variant="outlined"
              prepend-inner-icon="mdi-lock"
              :rules="passwordRules"
              hide-details="auto"
              dense
            />

            <v-text-field
              v-model="confirm"
              :append-inner-icon="showConfirm ? 'mdi-eye-off' : 'mdi-eye'"
              :type="showConfirm ? 'text' : 'password'"
              @click:append-inner="() => (showConfirm = !showConfirm)"
              label="Confirm Password"
              variant="outlined"
              prepend-inner-icon="mdi-lock-check"
              :rules="confirmRules"
              hide-details="auto"
              dense
            />

            <v-btn
              :loading="loading"
              type="submit"
              block
              large
              color="primary"
            >
              Set Password
            </v-btn>

            <v-alert
              v-if="message"
              :type="messageType"
              class="mt-4"
              dense
              dismissible
              @click:close="message = ''"
            >
              {{ message }}
            </v-alert>
          </v-form>

          <div class="text-center mt-4">
            <NuxtLink to="/login">Back to login</NuxtLink>
          </div>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { useSupabase } from "~/composables/useSupabase"

definePageMeta({ layout: false })

const supabase = useSupabase()
const router = useRouter()

const formRef = ref()
const password = ref("")
const confirm = ref("")
const showPassword = ref(false)
const showConfirm = ref(false)
const loading = ref(false)
const valid = ref(false)
const message = ref("")
const messageType = ref<"success" | "error">("error")

const tokenMissing = ref(false)

/* TOKEN EXTRACTOR — TS SAFE FIX */
function extractToken(): string | null {
  const search = new URLSearchParams(window.location.search)

  const q1 = search.get("access_token")
  if (q1 !== null) return q1

  const q2 = search.get("token")
  if (q2 !== null) return q2

  const hash = window.location.hash || ""

  if (hash.includes("access_token=")) {
    const val = hash.split("access_token=")[1]?.split("&")[0]
    return val ?? null
  }

  if (hash.includes("token=")) {
    const val = hash.split("token=")[1]?.split("&")[0]
    return val ?? null
  }

  return null
}

const token = ref<string | null>(null)

onMounted(() => {
  token.value = extractToken()

  if (!token.value) {
    tokenMissing.value = true
    messageType.value = "error"
    message.value = "Invalid or expired reset link."
  }
})

const passwordRules = [
  (v: string) => !!v || "Password is required",
  (v: string) => (v?.length ?? 0) >= 8 || "Min 8 characters"
]

const confirmRules = [
  (v: string) => !!v || "Please confirm password",
  (v: string) => v === password.value || "Passwords do not match"
]

async function onReset() {
  if (formRef.value && !(await formRef.value.validate())) return

  if (!token.value) {
    tokenMissing.value = true
    return
  }

  loading.value = true
  message.value = ""

  try {
    const { error } = await supabase.auth.updateUser({
      password: password.value
    })

    if (error) {
      messageType.value = "error"
      message.value = error.message
      loading.value = false
      return
    }

    messageType.value = "success"
    message.value = "Password updated! Redirecting..."

    setTimeout(() => router.push("/login"), 1200)
  } catch (err: any) {
    messageType.value = "error"
    message.value = err?.message ?? "Something went wrong."
  }

  loading.value = false
}
</script>


<style scoped>
.page-hero {
  position: relative;
  min-height: 100vh;
}
.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f7fbff 0%, #e3f0ff 45%, #fefefe 100%);
  z-index: 0;
}
.auth-card {
  position: relative;
  border-radius: 12px;
  backdrop-filter: blur(6px);
}
.text-grey {
  color: #6b7280;
}
</style>
