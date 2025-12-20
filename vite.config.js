import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext', // This fixes the Web3 build error
    commonjsOptions: {
      transformMixedEsModules: true, // Helps with wallet libraries
    },
  },
})

