<template>
  <div class="d-flex flex-column align-center justify-center" style="height: 80vh">
    <v-card class="pa-6" width="420" elevation="2">
      <h2 class="text-h5 mb-4 text-center">Welcome!</h2>

      <p class="text-body-2 text-center mb-4">
        Your email has been verified successfully.<br />
        You may now proceed.
      </p>

      <v-btn
        block
        color="primary"
        size="large"
        @click="goToDashboard"
      >
        Continue to Dashboard
      </v-btn>
    </v-card>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router"
import { useNuxtApp, onMounted } from "#app"

const { $supabase } = useNuxtApp()
const router = useRouter()

// If user is already logged in, redirect automatically
onMounted(async () => {
  const {
    data: { session },
  } = await $supabase.auth.getSession()

  if (session) {
    router.push("/dean/dashboard")
  }
})

function goToDashboard() {
  router.push("/dean/dashboard")
}
</script>
