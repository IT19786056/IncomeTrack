import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(() => {
  return {
    plugins: [react(), 
      tailwindcss(),
      VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['vite.svg'],
          manifest: {
            name: 'PayGround - Income Tracker',
            short_name: 'PayGround',
            description: 'Tracks Income',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })],
    build: {
      rollupOptions: {
        output: {
          /**
           * Split the heavy vendors out of the app chunk. This matters on
           * mobile connections: the app code changes often, while these three
           * stay cached across deploys.
           */
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            charts: ['recharts'],
            genai: ['@google/genai'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
