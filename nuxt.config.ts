// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt','pinia-plugin-persistedstate/nuxt', '@nuxtjs/tailwindcss'],
  pinia: {
    storesDirs: ['./stores/**', './custom-folder/stores/**'],
  },
  nitro: {
    experimental: {
      websocket: true
    },
    routeRules: {
      '/**': {
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'X-Frame-Options': '',
          'Content-Security-Policy': "frame-ancestors http: https: *"
        }
      }
    }
  },
  security: {
    headers: {
      xFrameOptions: false,
      contentSecurityPolicy: {
        'frame-ancestors': ["'self'", "*"],
      }
    }
  },
  vite: {
    server: {
      host: '0.0.0.0',
      allowedHosts: [
        'saluence.net',
        'www.saluence.net',
        'localhost',
      ],
    },
  },
})