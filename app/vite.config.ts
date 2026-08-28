import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { createReadStream, existsSync, statSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { join, extname, dirname, relative } from 'node:path'

const SITE = fileURLToPath(new URL('../site', import.meta.url))

const MIME: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.csv': 'text/csv', '.txt': 'text/plain',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf',
}

/**
 * Serves the imagery that still lives in ../site.
 *
 * 28 MB of photographs are shared between the static site and this app. Rather
 * than commit a second copy under public/, they are served from where they
 * already are: through middleware in dev, and copied into the bundle at build.
 *
 * HTML is excluded on purpose. site/ also holds index.html and 79 *.dc.html
 * files whose names are now redirect routes — served as files they would
 * shadow the SPA shell, and the old page renders convincingly enough that you
 * would not notice for a while.
 */
function siteAssets(): Plugin {
  const isAsset = (path: string) => !/\.html$/i.test(path)

  return {
    name: 'in-site-assets',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) return next()

        const pathname = decodeURIComponent(req.url.split(/[?#]/)[0])
        if (pathname.includes('..') || !isAsset(pathname)) return next()

        const file = join(SITE, pathname)
        if (!file.startsWith(SITE) || !existsSync(file) || !statSync(file).isFile()) return next()

        res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },

    writeBundle(options) {
      const out = options.dir
      if (!out) return

      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const source = join(dir, entry.name)
          if (entry.isDirectory()) { walk(source); continue }
          if (!isAsset(source)) continue
          const dest = join(out, relative(SITE, source))
          mkdirSync(dirname(dest), { recursive: true })
          copyFileSync(source, dest)
        }
      }
      walk(SITE)
    },
  }
}

export default defineConfig({
  plugins: [react(), siteAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
