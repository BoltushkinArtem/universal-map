/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_YANDEX_API_KEY: string;
  readonly VITE_MAPBOX_TOKEN: string;
  readonly VITE_OPENTRANSPORT_KEY: string;
  // здесь можно добавить другие VITE_ переменные
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
