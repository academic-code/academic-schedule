import { ref } from "vue";
import { useNuxtApp } from "#app";

// GLOBAL USER STATES
export const currentUser = ref(null);         // Record from public.users
export const currentRole = ref(null);         // ADMIN | DEAN | FACULTY
export const currentDepartmentId = ref(null); // Only for DEAN

export async function loadUser() {
  const nuxtApp = useNuxtApp();

  // ❗ Safety check: Supabase plugin must be loaded
  if (!nuxtApp.$supabase) {
    console.warn("Supabase client not ready yet.");
    return;
  }

  const { $supabase } = nuxtApp;

  // 1️⃣ GET AUTH USER
  const { data: authData, error: authError } = await $supabase.auth.getUser();

  if (authError || !authData.user) {
    // Not logged in gracefully
    currentUser.value = null;
    currentRole.value = null;
    currentDepartmentId.value = null;
    return;
  }

  const authUser = authData.user;

  // 2️⃣ GET USER FROM public.users
  const { data: appUser, error: appUserError } = await $supabase
    .from("users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .single();

  if (appUserError) {
    console.warn("Error loading public.users:", appUserError);
  }

  if (!appUser) {
    // ❗ Important: User is not in public.users → force logout on redirect
    console.warn(
      "Auth user exists but NOT found in public.users table. Insert required."
    );
    currentUser.value = null;
    currentRole.value = null;
    currentDepartmentId.value = null;
    return;
  }

  // Store basic user data
  currentUser.value = appUser;
  currentRole.value = appUser.role;

  // 3️⃣ IF DEAN → load department from deans table
  if (appUser.role === "DEAN") {
    const { data: deanData, error: deanError } = await $supabase
      .from("deans")
      .select("department_id")
      .eq("user_id", appUser.id)
      .single();

    if (deanError) {
      console.warn("Dean record missing:", deanError);
      currentDepartmentId.value = null;
    } else {
      currentDepartmentId.value = deanData?.department_id || null;
    }
  }

  // 4️⃣ FACULTY → no department needed
  if (appUser.role === "FACULTY") {
    currentDepartmentId.value = null;
  }

  // 5️⃣ ADMIN → no department
  if (appUser.role === "ADMIN") {
    currentDepartmentId.value = null;
  }
}
