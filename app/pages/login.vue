<template>
  <div class="login-container d-flex align-center justify-center">
    <v-card width="420" elevation="4" class="pa-6">

      <div class="text-center mb-6">
        <v-img src="/Logo.png" width="80" class="mx-auto mb-2" />
        <h2 class="text-h5">Academic Scheduler</h2>
      </div>

      <!-- ALERT -->
      <v-alert
        v-if="alertMessage"
        :type="alertType"
        class="mb-4"
        closable
        @click:close="alertMessage = ''"
      >
        {{ alertMessage }}
      </v-alert>

      <v-text-field
        v-model="email"
        label="Email"
        type="email"
        prepend-inner-icon="mdi-email"
        class="mb-4"
        outlined
      />

      <v-text-field
        v-model="password"
        label="Password"
        type="password"
        prepend-inner-icon="mdi-lock"
        class="mb-6"
        outlined
      />

      <v-btn color="primary" block @click="login">
        Login
      </v-btn>

      <div class="mt-4 text-center">
        <NuxtLink to="/forgot-password">
          Forgot your password?
        </NuxtLink>
      </div>

    </v-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { currentRole, loadUser } from "~/composables/useUser";
import { useSupabase } from "~/composables/useSupabase";

definePageMeta({ layout: false });

const supabase = useSupabase();
const email = ref("");
const password = ref("");
const alertMessage = ref("");
const alertType = ref("error");

async function login() {
  if (!email.value || !password.value) {
    return showAlert("Please enter your email and password.", "error");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });

  if (error) return showAlert("Invalid email or password", "error");

  await loadUser();

  if (currentRole.value === "ADMIN") return navigateTo("/admin/dashboard");
  if (currentRole.value === "DEAN") return navigateTo("/dean/dashboard");
  if (currentRole.value === "FACULTY") return navigateTo("/faculty/schedule");

  showAlert("Unknown role assigned to your account!", "error");
}

function showAlert(msg, type) {
  alertMessage.value = msg;
  alertType.value = type;
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  background: #f5f5f5;
}
</style>
