import { useLiveQuery } from 'dexie-react-hooks'
import { db, Agent } from '../db'
import { useState } from 'react'
import { Card, Field, Page, sure } from '../ui'

export default function Agents() {
  const agents = useLiveQuery(() => db.agents.toArray(), []) ?? []
  const companies = useLiveQuery(() => db.companies.toArray(), []) ?? []
  const departments = useLiveQuery(() => db.departments.toArray(), []) ?? []
  const [q, setQ] = useState('')
  const up = (a: Agent, patch: Partial<Agent>) => db.agents.update(a.id!, patch)
  const add = (managerId: number) => db.agents.add({ name: 'Nuovo agente', role: 'Ruolo', instructions: '', companyId: 0, departmentId: 0, managerId })

  // Organigramma ricorsivo: ogni agente sotto il proprio manager.
  const Node = ({ a, depth }: { a: Agent; depth: number }) => (
    <div style={{ marginLeft: depth * 12 }} className="space-y-2">
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Field label="Nome"><input value={a.name} onChange={(e) => up(a, { name: e.target.value })} /></Field>
          <Field label="Ruolo"><input value={a.role} onChange={(e) => up(a, { role: e.target.value })} /></Field>
          <Field label="Società">
            <select value={a.companyId} onChange={(e) => up(a, { companyId: +e.target.value, departmentId: 0 })}>
              <option value={0}>Holding</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Reparto">
            <select value={a.departmentId} onChange={(e) => up(a, { departmentId: +e.target.value })}>
              <option value={0}>—</option>{departments.filter((d) => d.companyId === a.companyId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Istruzioni"><textarea rows={2} value={a.instructions} onChange={(e) => up(a, { instructions: e.target.value })} /></Field>
        <div className="flex gap-2">
          <button className="sec" onClick={() => add(a.id!)}>+ Subordinato</button>
          <button className="danger" onClick={async () => { if (!sure('l\'agente "' + a.name + '"')) return; await db.agents.where('managerId').equals(a.id!).modify({ managerId: a.managerId }); await db.agents.delete(a.id!) }}>Elimina</button>
        </div>
      </Card>
      {agents.filter((s) => s.managerId === a.id && s.id !== a.id).map((s) => <Node key={s.id} a={s} depth={depth + 1} />)}
    </div>
  )
  const ids = new Set(agents.map((a) => a.id))
  const roots = agents.filter((a) => !a.managerId || !ids.has(a.managerId))
  return (
    <Page title="Agenti — organigramma" actions={<button onClick={() => add(0)}>+ Agente</button>}>
      <input placeholder="Cerca agente per nome, ruolo o istruzioni" value={q} onChange={(e) => setQ(e.target.value)} />
      {agents.length === 0 && <Card><span className="text-slate-400">Nessun agente: aggiungine uno con + Agente.</span></Card>}
      {q.trim() ? agents.filter((a) => (a.name + ' ' + a.role + ' ' + a.instructions).toLowerCase().includes(q.toLowerCase())).map((a) => <Node key={a.id} a={a} depth={0} />) : roots.map((a) => <Node key={a.id} a={a} depth={0} />)}
    </Page>
  )
}


