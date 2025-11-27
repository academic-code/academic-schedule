export default defineNuxtConfig({
  build: {
    transpile: ['vuetify']
  },
  modules: [
        '@nuxt/icon',
      ],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  }
})
