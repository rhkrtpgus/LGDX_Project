import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function buildProxyConfig(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  const javaApiBaseUrl = env.VITE_JAVA_API_BASE_URL ?? '/api'
  const fastapiApiBaseUrl = env.VITE_FASTAPI_API_BASE_URL ?? '/fastapi'
  const javaProxyTarget = env.VITE_JAVA_PROXY_TARGET ?? 'http://localhost:8082'
  const fastapiProxyTarget = env.VITE_FASTAPI_PROXY_TARGET ?? 'http://localhost:8000'
  const proxy: Record<string, { target: string; changeOrigin: boolean }> = {}

  if (javaApiBaseUrl.startsWith('/')) {
    proxy[javaApiBaseUrl] = {
      target: javaProxyTarget,
      changeOrigin: true,
    }
  }

  if (fastapiApiBaseUrl.startsWith('/')) {
    proxy[fastapiApiBaseUrl] = {
      target: fastapiProxyTarget,
      changeOrigin: true,
    }
  }

  return proxy
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    proxy: buildProxyConfig(mode),
  },
}))
