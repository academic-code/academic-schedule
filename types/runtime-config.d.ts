export {}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
  }

  interface PublicRuntimeConfig {
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SITE_URL: string
  }
}
