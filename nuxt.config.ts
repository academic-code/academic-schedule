export default defineNuxtConfig({
  build: {
    transpile: ['vuetify']
  },
  modules: ['@nuxt/icon'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    }
  }
})
