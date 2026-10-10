import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Конфигурация Vite: подключаем плагин React (JSX + быстрая перезагрузка)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Библиотеки — в отдельные файлы: браузер кэширует их отдельно от кода
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
    // Сам Three.js весит ~600 КБ (≈150 КБ в gzip) — это нормально для 3D-приложения
    chunkSizeWarningLimit: 800,
  },
});
