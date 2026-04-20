import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Match docker nginx: same paths, targets local microservice ports. */
const microserviceProxy = {
  '/api/users': {
    target: 'http://localhost:8001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/users/, '') || '/',
  },
  '/api/restaurants': {
    target: 'http://localhost:8002',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/restaurants/, '') || '/',
  },
  '/api/owner': {
    target: 'http://localhost:8003',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/owner/, '') || '/',
  },
  '/api/reviews': {
    target: 'http://localhost:8004',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/reviews/, '') || '/',
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: microserviceProxy,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})