import { useNuxtApp } from "#app"

export function useSupabase() {
  const nuxt = useNuxtApp()
  return nuxt.$supabase
}
