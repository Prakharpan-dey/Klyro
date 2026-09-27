/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// `npm run preview` serves the production build with the same CSP as Amplify, so breakage shows up locally
const csp = /value: "(default-src[^"]+)"/.exec(readFileSync('../customHttp.yml', 'utf8'))?.[1]

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    proxy: {
      // local planner from `npm run dev` in ../api
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    headers: csp
      ? {
          'Content-Security-Policy': csp.replace(
            'connect-src',
            'connect-src http://localhost:3001',
          ),
        }
      : {},
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        /*
         * The heavy readers only matter once a file is staged, so they are kept
         * out of the entry chunk: a visitor who reads the landing page and
         * leaves never downloads pdf.js or the office writers.
         */
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          // pdfjs and pdf-lib are already reached through import(), and naming
          // them here would pull the whole library in behind the one static
          // `?url` worker reference. Only the always-static vendors are grouped.
          if (id.includes('jszip') || id.includes('node-forge')) return 'archive'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
  },
})
