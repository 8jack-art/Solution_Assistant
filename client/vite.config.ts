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
    // 排除模块以避免问题
    exclude: [
      'stream',
      '@ckeditor/ckeditor5-build-classic',
      '@ckeditor/ckeditor5-build-inline'
    ],
    // 暂时移除这些模块以解决类继承问题
    force: true // 强制重建依赖以解决类继承问题
  },
  build: {
    // 忽略source map错误
    sourcemap: false,
    // 添加 rollup 配置以正确处理类继承
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'xmlbuilder-group': ['xmlbuilder2', '@oozcitak/util', '@oozcitak/dom', '@oozcitak/infra', '@oozcitak/url']
        }
      }
    }
  },
  define: {
    // 抑制React Router Future Flag警告
    'process.env.REACT_ROUTER_FUTURE_FLAGS': JSON.stringify({
      v7_startTransition: true,
      v7_relativeSplatPath: true
    })
  }
})
