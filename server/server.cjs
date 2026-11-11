const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = 3106
const HOST = '127.0.0.1'
const DIST = path.join(__dirname, '..', 'dist')
const DATA_FILE = path.join(os.homedir(), '.app-personali', 'data', 'ai-holding.json')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' }

function loadEnv() {
  const file = path.join(os.homedir(), '.app-personali', 'gemini.env')
  if (!fs.existsSync(file)) return { error: 'File non trovato: ' + file + '. Crea il file con GEMINI_API_KEY e GEMINI_MODEL.' }
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  if (!env.GEMINI_API_KEY) return { error: 'GEMINI_API_KEY mancante in gemini.env.' }
  return { key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash' }
}

async function generate({ system, prompt }) {
  const e = loadEnv()
  if (e.error) return { ok: false, error: e.error }
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(e.model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': e.key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: String(system || '') }] },
        contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: 'Errore Gemini ' + res.status + ': ' + ((data.error && data.error.message) || res.statusText) }
    const text = ((data.candidates || [])[0]?.content?.parts || []).map((p) => p.text || '').join('')
    if (!text) return { ok: false, error: 'Gemini ha restituito una risposta vuota.' }
    return { ok: true, text, model: e.model }
  } catch (err) {
    return { ok: false, error: 'Errore di rete: ' + (err && err.message ? err.message : String(err)) }
  }
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { return null }
}
function body(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => { size += c.length; if (size > 50e6) { reject(new Error('too big')); req.destroy() } else chunks.push(c) })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/api/gemini') {
      if (req.method === 'GET') { const e = loadEnv(); return send(res, 200, e.error ? { ok: false, error: e.error } : { ok: true, model: e.model }) }
      if (req.method === 'POST') return send(res, 200, await generate(await body(req)))
    }
    if (url.pathname === '/api/data') {
      if (req.method === 'GET') {
        const s = readStore()
        return send(res, 200, s ? s : { version: 0, data: null })
      }
      if (req.method === 'PUT') {
        const b = await body(req)
        const cur = readStore()
        const curV = cur ? cur.version : 0
        if (b.baseVersion !== curV) return send(res, 409, cur || { version: 0, data: null })
        const next = { version: curV + 1, savedAt: Date.now(), data: b.data }
        fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
        fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(next))
        fs.renameSync(DATA_FILE + '.tmp', DATA_FILE)
        return send(res, 200, { version: next.version })
      }
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' })
    let rel = decodeURIComponent(url.pathname)
    if (rel === '/') rel = '/index.html'
    const file = path.normalize(path.join(DIST, rel))
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('Not found') }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(buf)
    })
  } catch (err) {
    send(res, 500, { error: String(err && err.message ? err.message : err) })
  }
})
server.on('error', (e) => { if (e.code !== 'EADDRINUSE') console.error(e.message); if (require.main === module) process.exit(e.code === 'EADDRINUSE' ? 0 : 1) })
server.listen(PORT, HOST)
module.exports = { PORT, HOST }
