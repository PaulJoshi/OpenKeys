import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base` can be overridden for GitHub Pages project sites: BASE=/OpenKeys/ npm run build
const base = process.env.BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'OpenKeys — piano teacher',
        short_name: 'OpenKeys',
        description: 'Open-source piano learning in the browser: play, listen, judge, teach.',
        theme_color: '#1b2433',
        background_color: '#10151f',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // App shell + built-in songs are precached; piano samples are cached on first use
        // (the sampler fetches every sample at start-up, so one session makes them offline).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,abc,musicxml}'],
        globIgnores: ['samples/**', 'models/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/models/'),
            handler: 'CacheFirst',
            options: { cacheName: 'openkeys-models', expiration: { maxEntries: 10 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/samples/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'openkeys-samples',
              expiration: { maxEntries: 200 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 2500 },
});
