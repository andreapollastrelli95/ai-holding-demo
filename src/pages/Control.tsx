import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, log } from '../db'
import { Card, Err, Page, sure } from '../ui'
import { exportData, importData, validateBackup } from '../sync'

export default function Control() {
  const decisions = useLiveQuery(() => db.decisions.orderBy('id').reverse().toArray(), []) ?? []
  const logs = useLiveQuery(() => db.logs.orderBy('at').reverse().limit(100).toArray(), []) ?? []
  const [t, setT] = useState('')
  const [lq, setLq] = useState('')
  const [ds, setDs] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const download = async (name: string) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(await exportData(), null, 1)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
  }
  const onFile = async (f?: File) => {
    setErr(''); setMsg('')
    if (!f) return
    try {
      const tables = validateBackup(JSON.parse(await f.text()))
      if (!window.confirm('Il backup contiene ' + tables.agents.length + ' agenti, ' + tables.tasks.length + ' task, ' + tables.companies.length + ' società. Sostituire TUTTI i dati attuali? Prima verrà scaricato un backup di sicurezza.')) return
      await download('ai-holding-prima-import-' + Date.now() + '.json')
      await importData(tables)
    } catch (e) { setErr('Import annullato: ' + (e instanceof Error ? e.message : String(e))) }
  }
  const decide = async (id: number, title: string, status: 'approvata' | 'rifiutata') => { await db.decisions.update(id, { status }); await log('decisione', `${title}: ${status}`) }
  return (
    <Page title="Controllo">
      <Err msg={err} />
      {msg && <div className="bg-green-50 text-green-700 border border-green-200 rounded p-2">{msg}</div>}
      <Card title="Backup dati">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => download('ai-holding-backup-' + new Date().toISOString().slice(0, 10) + '.json').then(() => setMsg('Backup scaricato.'))}>Esporta JSON</button>
          <label className="inline-block rounded px-3 py-1 bg-slate-200 cursor-pointer">Importa JSON<input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} /></label>
        </div>
      </Card>
      <Card title="Decisioni">
        <select value={ds} onChange={(e) => setDs(e.target.value)}><option value="">Tutte le decisioni</option><option>in attesa</option><option>approvata</option><option>rifiutata</option></select>
        {decisions.length === 0 && <div className="text-slate-400">Nessuna decisione.</div>}
        {decisions.filter((d) => !ds || d.status === ds).map((d) => (
          <div key={d.id} className="border-b py-2 flex items-center gap-2">
            <div className="flex-1"><b>{d.title}</b> <em className="text-slate-500">[{d.status}]</em><div className="text-slate-600">{d.description}</div></div>
            {d.status === 'in attesa' && <><button onClick={() => decide(d.id!, d.title, 'approvata')}>Approva</button><button className="danger" onClick={() => decide(d.id!, d.title, 'rifiutata')}>Rifiuta</button></>}
            <button className="sec" onClick={() => sure('la decisione "' + d.title + '"') && db.decisions.delete(d.id!)}>×</button>
          </div>
        ))}
        <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (t.trim()) { db.decisions.add({ title: t.trim(), description: '', status: 'in attesa', createdAt: Date.now() }); setT('') } }}>
          <input placeholder="Nuova decisione da approvare" value={t} onChange={(e) => setT(e.target.value)} /><button>Aggiungi</button>
        </form>
      </Card>
      <Card title="Log delle attività">
        <div className="flex justify-end"><button className="sec" onClick={() => sure('tutto il log') && db.logs.clear()}>Svuota log</button></div>
        <input placeholder="Filtra il log (testo o tipo)" value={lq} onChange={(e) => setLq(e.target.value)} />
        {logs.length === 0 && <div className="text-slate-400">Il log è vuoto.</div>}
        {logs.filter((l) => (l.kind + ' ' + l.message).toLowerCase().includes(lq.toLowerCase())).map((l) => <div key={l.id} className="text-xs border-b py-0.5"><span className="text-slate-400">{new Date(l.at).toLocaleString('it-IT')}</span> [{l.kind}] {l.message}</div>)}
      </Card>
    </Page>
  )
}

