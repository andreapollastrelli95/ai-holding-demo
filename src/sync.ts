import { db } from './db'

const VKEY = 'ai-holding-sync-version'
let version = Number(localStorage.getItem(VKEY) || 0)
let paused = false
let timer: ReturnType<typeof setTimeout> | undefined
let dirty = false

const exportAll = async () => Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()])))

async function importAll(data: Record<string, unknown[]>) {
  paused = true
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) { await t.clear(); if (data[t.name]?.length) await t.bulkAdd(data[t.name] as never[]) }
    })
  } finally { paused = false }
}

function adopt(v: number) { version = v; localStorage.setItem(VKEY, String(v)) }

async function reloadFromServer(s: { version: number; data: Record<string, unknown[]> }, why: string) {
  await importAll(s.data); adopt(s.version); dirty = false
  alert(why); location.reload()
}

async function push() {
  timer = undefined
  if (!dirty) return
  try {
    const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseVersion: version, data: await exportAll() }) })
    if (r.status === 409) { const s = await r.json(); if (s.data) await reloadFromServer(s, 'I dati sul server sono più recenti: li ricarico.'); return }
    if (r.ok) { adopt((await r.json()).version); dirty = false }
  } catch { /* server non raggiungibile: riprova alla prossima modifica */ }
}

const schedule = () => { if (paused) return; dirty = true; clearTimeout(timer); timer = setTimeout(push, 1000) }

// All'avvio scarica i dati; poi salva dopo ogni modifica (debounce) e ricontrolla al ritorno sulla pagina.
export async function syncStart(seed: () => Promise<void>) {
  let pushAfterSeed = false
  try {
    const s = await (await fetch('/api/data')).json()
    if (s.data) { await importAll(s.data); adopt(s.version) } else { pushAfterSeed = true; adopt(0) }
  } catch { /* offline: usa i dati locali */ }
  await seed()
  for (const t of db.tables) { t.hook('creating', () => { schedule() }); t.hook('updating', () => { schedule() }); t.hook('deleting', () => { schedule() }) }
  if (pushAfterSeed) schedule()
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || dirty) return
    try {
      const s = await (await fetch('/api/data')).json()
      if (s.data && s.version > version) await reloadFromServer(s, 'Dati aggiornati da un altro dispositivo: ricarico.')
    } catch { /* ignora */ }
  })
}

// Esportazione/importazione JSON dei dati, con controllo del file prima di sostituire.
export async function exportData() {
  return { app: 'ai-holding', format: 1, exportedAt: new Date().toISOString(), tables: await exportAll() }
}

export function validateBackup(obj: unknown): Record<string, unknown[]> {
  const o = obj as { app?: string; format?: number; tables?: Record<string, unknown> }
  if (!o || o.app !== 'ai-holding' || o.format !== 1 || typeof o.tables !== 'object' || !o.tables) throw new Error('Il file non è un backup di AI Holding.')
  const out: Record<string, unknown[]> = {}
  for (const t of db.tables) {
    const rows = o.tables[t.name]
    if (rows === undefined) { out[t.name] = []; continue }
    if (!Array.isArray(rows)) throw new Error(`Tabella "${t.name}" non valida.`)
    if (rows.some((r) => typeof r !== 'object' || r === null || typeof (r as { id?: unknown }).id !== 'number')) throw new Error(`Tabella "${t.name}": righe senza id numerico.`)
    out[t.name] = rows
  }
  if (!out.holding.length) throw new Error('Il backup non contiene la holding.')
  return out
}

export async function importData(tables: Record<string, unknown[]>) {
  await importAll(tables)
  dirty = true
  await push()
  location.reload()
}
