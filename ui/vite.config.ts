import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { DEV_HOST } = loadEnv(mode, process.cwd(), 'DEV_')

  return {
    plugins: [react()],
    server: {
      host: DEV_HOST || undefined,
      proxy: { '/api': { target: 'http://127.0.0.1:3010', changeOrigin: true } },
    },
    resolve: {
      alias: {
        '@camping/contracts': fileURLToPath(
          new URL('../contracts/src/index.ts', import.meta.url),
        ),
      },
    },
  }
})
