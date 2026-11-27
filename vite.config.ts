import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Auf GitHub Pages läuft die App unter /<repo-name>/ (setzt der Deploy-Workflow), lokal unter /.
  base: process.env.BASE_PATH ?? '/',
  // Unter Windows hat die normale Dateiüberwachung schnell aufeinanderfolgende Änderungen verpasst
  // (Dev-Server lieferte veraltete Module aus). Polling ist etwas teurer, aber zuverlässig.
  server: {
    watch: { usePolling: true, interval: 200 },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'logo.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'HomeMind',
        short_name: 'HomeMind',
        description: 'Haushalt, Einkauf, Ziele und To-dos an einem Ort',
        lang: 'de',
        theme_color: '#f4eee4',
        background_color: '#f4eee4',
        display: 'standalone',
        icons: [
          // PNGs für Startbildschirme (Android braucht Raster-Icons, „maskable“ ohne runde Ecken), SVG für scharfe Darstellung
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
})
