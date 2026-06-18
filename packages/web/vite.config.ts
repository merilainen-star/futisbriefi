import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Futisbriefi',
        short_name: 'Futisbriefi',
        lang: 'fi',
        description: 'MM 2026 -vedonlyöntibriefi',
        theme_color: '#0b3d2e',
        background_color: '#0b1411',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        // Cache the last briefing so the PWA works offline-ish.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('briefing.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'briefing', expiration: { maxEntries: 5 } },
          },
        ],
      },
    }),
  ],
});
