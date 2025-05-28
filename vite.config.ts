
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite'

export default defineConfig({
  plugins: [
    react(),
    livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' })
  ],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 60_001,
  },
  worker: { format: 'es' },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
