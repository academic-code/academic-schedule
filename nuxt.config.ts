export default {
  compatibilityDate: '2024-11-01',

  modules: [
    '@nuxtjs/supabase'
  ],

  ssr: true,

  build: {
    transpile: ['vuetify']
  },

  css: ['vuetify/styles'],

  runtimeConfig: {
    public: {
      SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    },
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
  }
}
