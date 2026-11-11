import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, log } from '../db'
import { runAgent } from '../ai'
import { Card, Err, Page, sure, useBusy } from '../ui'

export default function Meetings() {
  const meetings = useLiveQuery(() => db.meetings.orderBy('id').reverse().toArray(), []) ?? []
  const agents = useLiveQuery(() => db.agents.toArray(), []) ?? []
  const [topic, setTopic] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const { busy, error, setError, run } = useBusy()
  const name = (id: number) => agents.find((a) => a.id === id)?.name ?? '?'

  async function next(id: number) {
    const m = await db.meetings.get(id)
    if (!m) return
    const agent = agents.find((a) => a.id === m.agentIds[m.transcript.length % m.agentIds.length])
    if (!agent) return
    const history = m.transcript.map((t) => `${name(t.agentId)}: ${t.text}`).join('\n')
    const r = await runAgent(agent, `Riunione su: "${m.topic}".\n${history ? 'Interventi precedenti:\n' + history + '\n' : ''}Dai il tuo intervento in massimo 5 frasi.`)
    if (!r.ok) { setError(r.text); return }
    await db.meetings.update(id, { transcript: [...m.transcript, { agentId: agent.id!, text: r.text }] })
  }
  async function close(id: number) {
    const m = await db.meetings.get(id)
    if (!m) return
    const minutes = `Verbale — ${m.topic} (${new Date(m.createdAt).toLocaleString('it-IT')})\nPartecipanti: ${m.agentIds.map(name).join(', ')}\n\n` + m.transcript.map((t) => `${name(t.agentId)}: ${t.text}`).join('\n\n')
    await db.meetings.update(id, { minutes, closed: true })
    await log('riunione', `Riunione chiusa: ${m.topic}`)
  }

  return (
    <Page title="Riunioni">
      <Err msg={error} />
      <Card title="Nuova riunione">
        <input placeholder="Argomento" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          {agents.map((a) => <label key={a.id} className="flex items-center gap-1"><input type="checkbox" className="w-auto" checked={picked.includes(a.id!)} onChange={(e) => setPicked(e.target.checked ? [...picked, a.id!] : picked.filter((x) => x !== a.id))} />{a.name}</label>)}
        </div>
        <button disabled={!topic.trim() || picked.length < 2} onClick={() => { db.meetings.add({ topic: topic.trim(), agentIds: picked, transcript: [], minutes: '', closed: false, createdAt: Date.now() }); log('riunione', `Riunione creata: ${topic}`); setTopic(''); setPicked([]) }}>Crea (min. 2 agenti)</button>
      </Card>
      {meetings.length === 0 && <Card><span className="text-slate-400">Nessuna riunione: creane una sopra scegliendo almeno 2 agenti.</span></Card>}
      {meetings.map((m) => (
        <Card key={m.id} title={m.topic + (m.closed ? ' (chiusa)' : '')}>
          <div className="text-slate-500">Partecipanti: {m.agentIds.map(name).join(', ')}</div>
          {m.closed ? <pre className="whitespace-pre-wrap">{m.minutes}</pre> : m.transcript.map((t, i) => <div key={i}><b>{name(t.agentId)}:</b> <span className="whitespace-pre-wrap">{t.text}</span></div>)}
          <div className="flex gap-2">
            {!m.closed && <button disabled={busy} onClick={() => run(() => next(m.id!))}>{busy ? 'Attendo…' : `Prossimo intervento (${name(m.agentIds[m.transcript.length % m.agentIds.length])})`}</button>}
            {!m.closed && <button className="sec" disabled={m.transcript.length === 0} onClick={() => close(m.id!)}>Chiudi e salva verbale</button>}
            <button className="danger" onClick={() => sure('la riunione "' + m.topic + '"') && db.meetings.delete(m.id!)}>Elimina</button>
          </div>
        </Card>
      ))}
    </Page>
  )
}

