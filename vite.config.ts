import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/scp-zombie-checker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/scp-icon.svg'],
      manifest: {
        name: 'SCP Zombie Checker',
        short_name: 'SCP Checker',
        description: 'Offline-capable SCP field intake and zombie classification tool.',
        theme_color: '#101714',
        background_color: '#0a0d0c',
        display: 'standalone',
        start_url: '/scp-zombie-checker/',
        scope: '/scp-zombie-checker/',
        icons: [
          {
            src: 'icons/scp-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['tests/**', 'node_modules/**'],
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
}))
