/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_QWEN_API_KEY: string;
  readonly VITE_QWEN_MODEL: string;
  readonly VITE_QWEN_VL_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
