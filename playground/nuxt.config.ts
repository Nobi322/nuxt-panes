export default defineNuxtConfig({
  modules: ['nuxt-panes'],
  css: ['~/assets/main.css'],
  routeRules: {
    '/login': { panes: false }
  },
  compatibilityDate: '2026-06-30',
  panes: {
    exclude: ['/login'],
    homePath: '/inbox'
  }
})
