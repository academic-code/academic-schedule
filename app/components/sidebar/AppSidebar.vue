<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore'

import AdminSidebar from './AdminSidebar.vue'
import DeanSidebar from './DeanSidebar.vue'
import FacultySidebar from './FacultySidebar.vue'

const auth = useAuthStore()
</script>

<template>
  <AdminSidebar v-if="auth.user?.role === 'ADMIN'" />
  <DeanSidebar v-else-if="auth.user?.role === 'DEAN'" />
  <FacultySidebar v-else-if="auth.user?.role === 'FACULTY'" />
</template>
