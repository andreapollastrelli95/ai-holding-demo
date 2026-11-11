import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, log, STATUSES, Task, TaskStatus } from '../db'
import { runAgent } from '../ai'
import { Card, Err, Page, sure, useBusy } from '../ui'

export default function Work() {
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? []
  const companies = useLiveQuery(() => db.companies.toArray(), []) ?? []
  const agents = useLiveQuery(() => db.agents.toArray(), []) ?? []
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) ?? []
  const [pid, setPid] = useState(0)
  const [title, setTitle] = useState('')
  const [tt, setTt] = useState('')
  const [runningId, setRunningId] = useState(0)
  const { error, run } = useBusy()
  const project = projects.find((p) => p.id === pid)
  const [q, setQ] = useState('')
  const [fa, setFa] = useState(0)
  const ptasks = tasks.filter((t) => t.projectId === pid && (!fa || t.agentId === fa) && t.title.toLowerCase().includes(q.toLowerCase()))

  async function execute(t: Task) {
    const agent = agents.find((a) => a.id === t.agentId)
    if (!agent) throw new Error('Assegna prima un agente al task.')
    setRunningId(t.id!)
    try {
      await db.tasks.update(t.id!, { status: 'in corso' })
      const r = await runAgent(agent, `Esegui questo task e dai il risultato.\nProgetto: ${project?.title}\nTask: ${t.title}\n${t.description}`)
      if (!r.ok) { await db.tasks.update(t.id!, { status: 'da fare' }); throw new Error(r.text) }
      await db.tasks.update(t.id!, { output: r.text, status: 'in revisione' })
    } finally { setRunningId(0) }
  }

  return (
    <Page title="Lavoro">
      <Err msg={error} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Progetti">
          {projects.length === 0 && <div className="text-slate-400">Nessun progetto. Creane uno o fai scomporre un obiettivo al CEO dalla Holding.</div>}
          {projects.map((p) => <button key={p.id} className={'block w-full text-left ' + (p.id === pid ? '' : 'sec')} onClick={() => setPid(p.id!)}>{p.title}<div className="text-xs opacity-70">{companies.find((c) => c.id === p.companyId)?.name}</div></button>)}
          <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (title.trim() && companies[0]) { db.projects.add({ companyId: companies[0].id!, goalId: 0, title: title.trim(), description: '' }).then(setPid); setTitle('') } }}>
            <input placeholder="Nuovo progetto" value={title} onChange={(e) => setTitle(e.target.value)} /><button>+</button>
          </form>
        </Card>
        <div className="md:col-span-3 space-y-4">
          {!project && <Card><span className="text-slate-400">Seleziona un progetto.</span></Card>}
          {project && <>
            <Card>
              <div className="flex flex-wrap gap-2">
                <input value={project.title} onChange={(e) => db.projects.update(project.id!, { title: e.target.value })} />
                <select className="md:w-48" value={project.companyId} onChange={(e) => db.projects.update(project.id!, { companyId: +e.target.value })}>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                <button className="danger" onClick={async () => { if (!sure('il progetto e i suoi task')) return; await db.tasks.where('projectId').equals(project.id!).delete(); await db.projects.delete(project.id!); setPid(0) }}>Elimina</button>
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (tt.trim()) { db.tasks.add({ projectId: project.id!, title: tt.trim(), description: '', agentId: 0, status: 'da fare', output: '' }); setTt('') } }}>
                <input placeholder="Nuovo task" value={tt} onChange={(e) => setTt(e.target.value)} /><button>Aggiungi task</button>
              </form>
            </Card>
            <div className="flex flex-wrap gap-2"><input className="md:w-64" placeholder="Cerca task" value={q} onChange={(e) => setQ(e.target.value)} /><select className="md:w-56" value={fa} onChange={(e) => setFa(+e.target.value)}><option value={0}>Tutti gli agenti</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            {ptasks.length === 0 && <div className="text-slate-400">Nessun task da mostrare.</div>}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {STATUSES.map((s) => (
                <div key={s} className="bg-slate-200 rounded p-2 space-y-2">
                  <div className="font-semibold capitalize">{s} ({ptasks.filter((t) => t.status === s).length})</div>
                  {ptasks.filter((t) => t.status === s).map((t) => (
                    <div key={t.id} className="bg-white rounded p-2 space-y-1 shadow-sm">
                      <input value={t.title} onChange={(e) => db.tasks.update(t.id!, { title: e.target.value })} />
                      <select value={t.agentId} onChange={(e) => db.tasks.update(t.id!, { agentId: +e.target.value })}>
                        <option value={0}>— agente —</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                      <select value={t.status} onChange={(e) => db.tasks.update(t.id!, { status: e.target.value as TaskStatus })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                      {t.output && <details><summary className="cursor-pointer text-slate-500">Risultato</summary><div className="whitespace-pre-wrap text-xs">{t.output}</div></details>}
                      <div className="flex gap-1">
                        <button disabled={runningId !== 0} onClick={() => run(() => execute(t))}>{runningId === t.id ? 'Attendo…' : 'Esegui agente'}</button>
                        <button className="danger" onClick={() => { if (sure('il task "' + t.title + '"')) { db.tasks.delete(t.id!); log('task', `Task eliminato: ${t.title}`) } }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>
    </Page>
  )
}


