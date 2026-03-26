import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    passWithNoTests: true,
  },
  server: {
    proxy: {
      // Local: run `npx vercel dev` (default :3000) so /api/create-razorpay-order works during dev
      '/api': {
        target: process.env.VITE_VERCEL_DEV_URL || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
