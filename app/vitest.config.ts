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
  // The repository root, so `../api/*.test.js` can be loaded at all. Vite
  // refuses to serve outside its root by default and reports it as a missing
  // module, which reads as a typo in the include pattern rather than a policy.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
    // No keys, so `isSupabaseConfigured` is false and the content layer takes
    // its bundled path. Without this the suite opens a real realtime socket
    // against the production project, which is both slow and rude.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // `../api` is outside this config's root on purpose: the roster endpoint
    // lives at the repository root because that is where Vercel looks for
    // functions, and its guards are the one part of it that is pure enough to
    // test without a database. Leaving them out of the suite is how they went
    // untested in the first place.
    include: ['src/**/*.test.{ts,tsx}', '../api/**/*.test.js'],
  },
})
