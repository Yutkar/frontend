import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': new URL('./src/app', import.meta.url).pathname,
      '@components': new URL('./src/components', import.meta.url).pathname,
      '@features': new URL('./src/features', import.meta.url).pathname,
      '@layouts': new URL('./src/layouts', import.meta.url).pathname,
      '@mock': new URL('./src/mock', import.meta.url).pathname,
      '@pages': new URL('./src/pages', import.meta.url).pathname,
      '@routes': new URL('./src/routes', import.meta.url).pathname,
      '@services': new URL('./src/services', import.meta.url).pathname,
      '@shared': new URL('./src/shared', import.meta.url).pathname,
      '@store': new URL('./src/store', import.meta.url).pathname,
      '@types': new URL('./src/types', import.meta.url).pathname,
      '@widgets': new URL('./src/widgets', import.meta.url).pathname,
    },
  },
})
