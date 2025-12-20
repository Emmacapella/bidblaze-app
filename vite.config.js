import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // This fixes the "global is not defined" error common in Web3
    global: 'window',
  },
  build: {
    target: 'esnext', // Tells Vercel "It's okay to use modern code"
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext', // Ensures the pre-bundler also allows modern code
      define: {
        global: 'globalThis',
      },
    },
  },
})

