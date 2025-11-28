<template>
  <v-app>
    <v-main class="loading-screen d-flex align-center justify-center">
      <div class="loader-wrapper">

        <!-- LOGO -->
        <div class="logo-container">
          <v-img
            src="/logo.png"
            width="110"
            height="110"
            class="fade-in"
            contain
          />

          <!-- GLOW BACKDROP -->
          <div class="logo-glow"></div>
        </div>

        <!-- BRAND TEXT -->
        <div class="brand-text fade-in-delayed">
          Academic Scheduler
        </div>

        <!-- LOADING DOTS -->
        <div class="dots fade-in-delayed">
          <span></span><span></span><span></span>
        </div>

      </div>
    </v-main>
  </v-app>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { currentUser, currentRole, loadUser } from "~/composables/useUser";

const router = useRouter();

onMounted(async () => {
  // Load Supabase session & metadata
  await loadUser();

  // No session → go to login
  if (!currentUser.value) {
    return router.replace("/login");
  }

  // Redirect based on role
  switch (currentRole.value) {
    case "ADMIN":
      return router.replace("/admin/dashboard");

    case "DEAN":
      return router.replace("/dean/dashboard");

    case "FACULTY":
      return router.replace("/faculty/schedule");

    default:
      return router.replace("/login");
  }
});
</script>

<style scoped>
.loading-screen {
  height: 100vh;
  background: linear-gradient(
    135deg,
    #f5faff 0%,
    #e9f0ff 40%,
    #ffffff 100%
  );
}

.loader-wrapper {
  text-align: center;
  position: relative;
}

/* LOGO */
.logo-container {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.logo-glow {
  position: absolute;
  inset: -20px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(37, 99, 235, 0.25),
    transparent 60%
  );
  filter: blur(30px);
  z-index: -1;
}

/* BRAND TEXT */
.brand-text {
  font-weight: 600;
  font-size: 1.2rem;
  color: #2563eb;
  margin-top: 6px;
  letter-spacing: 0.5px;
}

/* DOT LOADING ANIMATION */
.dots {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.dots span {
  width: 10px;
  height: 10px;
  margin: 0 4px;
  background: #2563eb;
  border-radius: 50%;
  animation: dotPulse 1.2s infinite ease-in-out;
}

.dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dotPulse {
  0%, 60%, 100% { transform: scale(1); opacity: 0.7; }
  30% { transform: scale(1.6); opacity: 1; }
}

/* SMOOTH FADE IN */
.fade-in {
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
}

.fade-in-delayed {
  opacity: 0;
  animation: fadeIn 1s ease-out 0.3s forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
