import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    sourcemap: false, // отключаем генерацию sourcemaps при сборке
  },
  optimizeDeps: {
    exclude: ['@maplibre/maplibre-gl-style-spec', '@maplibre/vt-pbf']
  }
});
