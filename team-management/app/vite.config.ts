import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/team-management/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5175,
    proxy: {
      '/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sops': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/policies': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/tasks': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/syncItems': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/businessRules': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/checklistItems': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/files': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/kbArticles': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/announcements': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/notifications': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/calendarEvents': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/sopVersions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
