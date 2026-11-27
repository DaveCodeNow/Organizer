import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
      includeAssets: ['icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'Haushalt',
        short_name: 'Haushalt',
        description: 'Einkaufsliste, Rezepte und mehr',
        lang: 'de',
        theme_color: '#f6f7f4',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})
