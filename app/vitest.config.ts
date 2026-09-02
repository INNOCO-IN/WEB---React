import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Test config, separate from vite.config.ts.
 *
 * The build config carries a plugin that copies 28 MB of imagery out of
 * ../site, which a unit test has no use for and which would run on every
 * watch cycle.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // No keys, so `isSupabaseConfigured` is false and the content layer takes
    // its bundled path. Without this the suite opens a real realtime socket
    // against the production project, which is both slow and rude.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
