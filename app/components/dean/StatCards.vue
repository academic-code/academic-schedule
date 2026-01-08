<template>
  <v-row dense class="mb-6">
    <v-col
      v-for="item in visibleItems"
      :key="item.label"
      cols="12"
      sm="6"
      lg="3"
    >
      <v-card class="kpi-card pa-5">
        <div class="kpi-top">
          <v-icon :color="item.color">{{ item.icon }}</v-icon>
          <span class="kpi-label">{{ item.label }}</span>
        </div>
        <div class="kpi-value">{{ item.value }}</div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  stats: any
  departmentType: "REGULAR" | "GENED" | "PE_NSTP"
}>()

const allItems = computed(() => [
  {
    key: "classes",
    label: "Classes",
    value: props.stats?.classes ?? 0,
    icon: "mdi-google-classroom",
    color: "primary"
  },
  {
    key: "subjects",
    label: "Subjects",
    value: props.stats?.subjects ?? 0,
    icon: "mdi-book-open-page-variant",
    color: "indigo"
  },
  {
    key: "faculty",
    label: "Faculty",
    value: props.stats?.faculty ?? 0,
    icon: "mdi-account-group",
    color: "teal"
  },
  {
    key: "draft",
    label: "Draft Schedules",
    value: props.stats?.draft_schedules ?? 0,
    icon: "mdi-pencil",
    color: "orange"
  },
  {
    key: "published",
    label: "Published",
    value: props.stats?.published_schedules ?? 0,
    icon: "mdi-check-circle",
    color: "green"
  }
])

const visibleItems = computed(() => {
  if (props.departmentType === "REGULAR") {
    return allItems.value
  }

  // GENED / PE_NSTP
  return allItems.value.filter(
    i => !["classes", "subjects"].includes(i.key)
  )
})
</script>

<style scoped>
.kpi-card {
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.1);
}
.kpi-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kpi-label {
  font-size: 0.95rem;
  color: #6b7280;
}
.kpi-value {
  font-size: 2.2rem;
  font-weight: 700;
  margin-top: 12px;
}
</style>
