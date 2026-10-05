import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function crossPortSyncPlugin() {
  const syncFilePath = path.resolve(__dirname, '.blockshield_sync_state.json')

  return {
    name: 'cross-port-sync',
    configureServer(server) {
      server.middlewares.use('/api/sync-state', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          if (fs.existsSync(syncFilePath)) {
            try {
              const data = fs.readFileSync(syncFilePath, 'utf8')
              res.end(data || '{}')
              return
            } catch (_) {}
          }
          res.end('{}')
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', () => {
            try {
              let existing = {}
              if (fs.existsSync(syncFilePath)) {
                try {
                  existing = JSON.parse(fs.readFileSync(syncFilePath, 'utf8') || '{}')
                } catch (_) {}
              }
              const incoming = JSON.parse(body || '{}')
              const merged = { ...existing, ...incoming, _syncTimestamp: Date.now() }
              fs.writeFileSync(syncFilePath, JSON.stringify(merged, null, 2), 'utf8')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, timestamp: merged._syncTimestamp }))
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        res.statusCode = 404
        res.end()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crossPortSyncPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
