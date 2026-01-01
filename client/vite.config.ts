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
    host: '0.0.0.0', // 允许外部访问
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // 排除 Node.js 内置模块和可能导致问题的模块
    exclude: [
      'stream',
      'events',
      '@ckeditor/ckeditor5-build-classic',
      '@ckeditor/ckeditor5-build-inline'
    ],
    // 强制重建依赖以解决类继承问题
    force: true
  },
  build: {
    // 忽略source map错误
    sourcemap: false,
    // 添加 rollup 配置
  },
  define: {
    // 抑制React Router Future Flag警告
    'process.env.REACT_ROUTER_FUTURE_FLAGS': JSON.stringify({
      v7_startTransition: true,
      v7_relativeSplatPath: true
    })
  }
})
