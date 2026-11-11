import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db'
import { Card, Field, Page, sure } from '../ui'

export default function Companies() {
  const companies = useLiveQuery(() => db.companies.toArray(), []) ?? []
  const departments = useLiveQuery(() => db.departments.toArray(), []) ?? []
  const agents = useLiveQuery(() => db.agents.toArray(), []) ?? []
  const [sel, setSel] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [dep, setDep] = useState('')
  const c = companies.find((x) => x.id === sel)

  return (
    <Page title="Società">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Elenco">
          {companies.length === 0 && <div className="text-slate-400">Nessuna società.</div>}
          {companies.map((x) => <button key={x.id} className={'block w-full text-left ' + (x.id === sel ? '' : 'sec')} onClick={() => setSel(x.id!)}>{x.name}</button>)}
          <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { db.companies.add({ name: name.trim(), description: '' }); setName('') } }}>
            <input placeholder="Nuova società" value={name} onChange={(e) => setName(e.target.value)} /><button>+</button>
          </form>
        </Card>
        <div className="md:col-span-2 space-y-4">
          {!c && <Card><span className="text-slate-400">Seleziona una società.</span></Card>}
          {c && <>
            <Card title="Scheda">
              <Field label="Nome"><input value={c.name} onChange={(e) => db.companies.update(c.id!, { name: e.target.value })} /></Field>
              <Field label="Descrizione"><textarea rows={3} value={c.description} onChange={(e) => db.companies.update(c.id!, { description: e.target.value })} /></Field>
              <button className="danger" onClick={async () => {
                const na = agents.filter((a) => a.companyId === c.id).length, np = await db.projects.where('companyId').equals(c.id!).count()
                if (na || np) { alert(`Non si può eliminare: la società ha ${na} agenti e ${np} progetti. Spostali o eliminali prima.`); return }
                if (!sure('la società "' + c.name + '"')) return
                await db.departments.where('companyId').equals(c.id!).delete(); await db.companies.delete(c.id!); setSel(null) }}>Elimina società</button>
            </Card>
            <Card title="Reparti">
              {departments.filter((d) => d.companyId === c.id).map((d) => (
                <div key={d.id} className="flex gap-2 items-center border-b py-1">
                  <input value={d.name} onChange={(e) => db.departments.update(d.id!, { name: e.target.value })} />
                  <span className="whitespace-nowrap text-slate-500">{agents.filter((a) => a.departmentId === d.id).length} agenti</span>
                  <button className="danger" onClick={() => sure('il reparto "' + d.name + '"') && db.departments.delete(d.id!)}>×</button>
                </div>
              ))}
              <form className="flex gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); if (dep.trim()) { db.departments.add({ companyId: c.id!, name: dep.trim() }); setDep('') } }}>
                <input placeholder="Nuovo reparto" value={dep} onChange={(e) => setDep(e.target.value)} /><button>+</button>
              </form>
            </Card>
          </>}
        </div>
      </div>
    </Page>
  )
}


