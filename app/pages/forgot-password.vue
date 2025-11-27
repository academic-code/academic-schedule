<template>
  <v-container fluid class="page-hero pa-0">
    <div class="hero-gradient" />
    <v-row align="center" justify="center" class="fill-height">
      <v-col cols="12" md="6" lg="4">
        <v-card elevation="12" class="pa-6 auth-card">
          <div class="text-center mb-6">
            <v-img src="/logo.png" contain max-width="110" class="mx-auto mb-2" />
            <h3 class="mb-1">Forgot Password</h3>
            <div class="text-body-2 text-grey">Enter your email and we’ll send a reset link.</div>
          </div>

          <v-form ref="formRef" @submit.prevent="onSend" v-model="valid" lazy-validation>
            <v-text-field
              v-model="email"
              label="Email"
              variant="outlined"
              prepend-inner-icon="mdi-email"
              :rules="emailRules"
              hide-details="auto"
              dense
              autocomplete="email"
            />

            <v-btn :loading="loading" type="submit" color="primary" block large>
              Send Reset Link
            </v-btn>
          </v-form>

          <div class="text-center mt-4">
            <NuxtLink to="/login">Back to Login</NuxtLink>
          </div>

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
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSupabase } from '~/composables/useSupabase'

definePageMeta({ layout: false })

const supabase = useSupabase()
const formRef = ref()
const email = ref('')
const loading = ref(false)
const valid = ref(false)
const message = ref('')
const messageType = ref<'success'|'error'>('success')

const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'E-mail must be valid'
]

async function onSend() {
  if (formRef.value && !(await formRef.value.validate())) return

  loading.value = true
  message.value = ''

  try {
    const redirectTo = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo
    })

    if (error) {
      messageType.value = 'error'
      message.value = error.message
      return
    }

    messageType.value = 'success'
    message.value = 'If this email exists, we sent a reset link.'
  } catch (err: any) {
    messageType.value = 'error'
    message.value = err?.message ?? 'Failed to send reset link'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-hero { position: relative; min-height: 100vh; }
.hero-gradient {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, #f1f6ff 0%, #e6f0ff 40%, #f9f7ff 100%);
  z-index: 0;
}
.auth-card {
  position: relative;
  border-radius: 12px;
  backdrop-filter: blur(6px);
}
.text-grey { color: #6b7280; }
</style>
