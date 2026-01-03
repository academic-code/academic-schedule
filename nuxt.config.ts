export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@pinia/nuxt'
  ],

  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css'
  ],

  build: {
    transpile: ['vuetify']
  },

  runtimeConfig: {
    // 🔒 SERVER-ONLY (never exposed to client)
    SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // 🌐 CLIENT + SERVER
    public: {
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      SITE_URL: process.env.NUXT_PUBLIC_SITE_URL
    }
  }
})
