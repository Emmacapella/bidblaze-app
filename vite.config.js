import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}, // Fixes some wallet libs expecting Node.js
    global: 'globalThis',
  },
  build: {
    target: 'esnext', // Allow modern syntax
    commonjsOptions: {
      transformMixedEsModules: true, // Allow mixing old and new module types
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext', // CRITICAL: Tells the optimizer to allow modern syntax in dependencies
      supported: { 
        bigint: true 
      },
    },
  },
})

