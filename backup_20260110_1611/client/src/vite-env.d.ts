/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  // 在这里添加更多的环境变量类型定义
  readonly [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
