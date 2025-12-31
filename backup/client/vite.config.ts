import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // 排除stream模块以避免外部化警告
    exclude: ['stream'],
  },
  define: {
    // 抑制React Router Future Flag警告
    'process.env.REACT_ROUTER_FUTURE_FLAGS': JSON.stringify({
      v7_startTransition: true,
      v7_relativeSplatPath: true
    })
  }
})
