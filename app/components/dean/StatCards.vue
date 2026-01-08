<template>
  <v-row dense class="mb-6">
    <v-col
      v-for="item in items"
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

/* ---------------- PROPS ---------------- */
const props = defineProps<{
  stats: {
    classes: number
    subjects: number
    faculty: number
    draft_schedules: number
    published_schedules: number
  }
  departmentType: "REGULAR" | "GENED" | "PE_NSTP"
}>()

/* ---------------- KPI LOGIC ---------------- */
const items = computed(() => {
  // GENED / PE_NSTP → LIMITED KPIs
  if (props.departmentType !== "REGULAR") {
    return [
      {
        label: "Faculty",
        value: props.stats.faculty,
        icon: "mdi-account-group",
        color: "teal"
      },
      {
        label: "Draft Schedules",
        value: props.stats.draft_schedules,
        icon: "mdi-pencil",
        color: "orange"
      },
      {
        label: "Published",
        value: props.stats.published_schedules,
        icon: "mdi-check-circle",
        color: "green"
      }
    ]
  }

  // REGULAR → FULL KPIs
  return [
    {
      label: "Classes",
      value: props.stats.classes,
      icon: "mdi-google-classroom",
      color: "primary"
    },
    {
      label: "Subjects",
      value: props.stats.subjects,
      icon: "mdi-book-open-page-variant",
      color: "indigo"
    },
    {
      label: "Faculty",
      value: props.stats.faculty,
      icon: "mdi-account-group",
      color: "teal"
    },
    {
      label: "Draft Schedules",
      value: props.stats.draft_schedules,
      icon: "mdi-pencil",
      color: "orange"
    },
    {
      label: "Published",
      value: props.stats.published_schedules,
      icon: "mdi-check-circle",
      color: "green"
    }
  ]
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
