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
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SITE_URL: process.env.SITE_URL || process.env.NUXT_PUBLIC_SITE_URL,

    public: {
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      SITE_URL: process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL
    }
  }
})