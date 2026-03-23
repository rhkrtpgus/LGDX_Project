import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxyConfig = {
    '/api': {
      target: env.VITE_JAVA_PROXY_TARGET || 'http://localhost:8082',
      changeOrigin: true,
    },
    '/fastapi': {
      target: env.VITE_FASTAPI_PROXY_TARGET || 'http://localhost:8000',
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: {
      proxy: proxyConfig,
    },
    preview: {
      proxy: proxyConfig,
    },
  }
})
