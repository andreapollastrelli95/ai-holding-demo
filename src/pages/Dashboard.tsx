import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, log } from '../db'
import { runAgent } from '../ai'
import { Card, Err, Page, sure, useBusy } from '../ui'

export default function Dashboard() {
  const holding = useLiveQuery(() => db.holding.toCollection().first())
  const companies = useLiveQuery(() => db.companies.toArray(), []) ?? []
  const agents = useLiveQuery(() => db.agents.toArray(), []) ?? []
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const pending = useLiveQuery(() => db.decisions.where('status').equals('in attesa').toArray(), []) ?? []
  const [newGoal, setNewGoal] = useState('')
  const { busy, error, setError, run } = useBusy()
  const ceo = agents.find((a) => a.companyId === 0)

  async function decompose(goalId: number) {
    const goal = goals.find((g) => g.id === goalId)!
    if (!ceo) { setError('Nessun CEO agent (agente senza società).'); return }
    await run(async () => {
      const list = companies.map((c) => `- ${c.name}: agenti ${agents.filter((a) => a.companyId === c.id).map((a) => a.name + ' (' + a.role + ')').join(', ')}`).join('\n')
      const r = await runAgent(ceo, `Obiettivo: "${goal.title}".\nSocietà e agenti:\n${list}\nScomponi in 1-3 progetti, ciascuno con 2-4 task. Rispondi SOLO con JSON valido: {"projects":[{"company":"nome società","title":"","description":"","tasks":[{"title":"","description":"","agent":"nome agente"}]}]}`)
      if (!r.ok) { setError(r.text); return }
      let plan: { projects: { company: string; title: string; description?: string; tasks: { title: string; description?: string; agent: string }[] }[] }
      try { plan = JSON.parse((r.text.match(/\{[\s\S]*\}/) ?? [''])[0]) } catch { setError('Il CEO non ha restituito un JSON valido. Riprova.'); return }
      for (const p of plan.projects ?? []) {
        const co = companies.find((c) => c.name.toLowerCase() === (p.company || '').toLowerCase()) ?? companies[0]
        if (!co) continue
        const pid = await db.projects.add({ companyId: co.id!, goalId, title: p.title, description: p.description ?? '' })
        for (const t of p.tasks ?? []) {
          const ag = agents.find((a) => a.name.toLowerCase() === (t.agent || '').toLowerCase()) ?? agents.find((a) => a.companyId === co.id)
          await db.tasks.add({ projectId: pid, title: t.title, description: t.description ?? '', agentId: ag?.id ?? 0, status: 'da fare', output: '' })
        }
      }
      await db.decisions.add({ title: `Approvare piano per "${goal.title}"`, description: 'Il CEO ha scomposto l\'obiettivo in progetti e task.', status: 'in attesa', createdAt: Date.now() })
      await log('ceo', `Obiettivo "${goal.title}" scomposto.`)
    })
  }

  return (
    <Page title={holding?.name ?? 'Holding'}>
      <p className="text-slate-600">{holding?.mission}</p>
      <Err msg={error} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Società', companies.length], ['Agenti', agents.length], ['Task aperti', tasks.filter((t) => t.status !== 'completato').length], ['Decisioni in attesa', pending.length]].map(([l, v]) => (
          <Card key={l as string}><div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-semibold">{v}</div></Card>
        ))}
      </div>
      <Card title="Stato delle società">
        {companies.map((c) => (
          <div key={c.id} className="flex justify-between border-b py-1"><Link className="underline" to="/societa">{c.name}</Link>
            <span>{projects.filter((p) => p.companyId === c.id).length} progetti · {agents.filter((a) => a.companyId === c.id).length} agenti</span></div>
        ))}
      </Card>
      <Card title="Obiettivi">
        {goals.length === 0 && <div className="text-slate-400">Nessun obiettivo: aggiungine uno qui sotto.</div>}
        {goals.map((g) => (
          <div key={g.id} className="flex items-center gap-2 border-b py-1">
            <span className="flex-1">{g.title} <em className="text-slate-400">({g.status})</em></span>
            <button disabled={busy} onClick={() => decompose(g.id!)}>{busy ? 'Attendo CEO…' : 'Scomponi con CEO'}</button>
            <button className="sec" onClick={() => db.goals.update(g.id!, { status: g.status === 'attivo' ? 'completato' : 'attivo' })}>Stato</button>
            <button className="danger" onClick={() => sure('l\'obiettivo "' + g.title + '"') && db.goals.delete(g.id!)}>Elimina</button>
          </div>
        ))}
        <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (newGoal.trim()) { db.goals.add({ title: newGoal.trim(), status: 'attivo' }); setNewGoal('') } }}>
          <input placeholder="Nuovo obiettivo" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} /><button>Aggiungi</button>
        </form>
      </Card>
      <Card title="Decisioni in attesa">
        {pending.length === 0 && <div className="text-slate-400">Nessuna decisione in attesa.</div>}
        {pending.map((d) => <div key={d.id}>{d.title} — <Link className="underline" to="/controllo">vai a Controllo</Link></div>)}
      </Card>
    </Page>
  )
}


