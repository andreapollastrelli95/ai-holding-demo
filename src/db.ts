import Dexie, { Table } from 'dexie'

export interface Holding { id?: number; name: string; mission: string }
export interface Company { id?: number; name: string; description: string }
export interface Department { id?: number; companyId: number; name: string }
export interface Agent { id?: number; name: string; role: string; instructions: string; companyId: number; departmentId: number; managerId: number }
export interface Goal { id?: number; title: string; status: 'attivo' | 'completato' }
export interface Project { id?: number; companyId: number; goalId: number; title: string; description: string }
export type TaskStatus = 'da fare' | 'in corso' | 'in revisione' | 'completato'
export const STATUSES: TaskStatus[] = ['da fare', 'in corso', 'in revisione', 'completato']
export interface Task { id?: number; projectId: number; title: string; description: string; agentId: number; status: TaskStatus; output: string }
export interface Turn { agentId: number; text: string }
export interface Meeting { id?: number; topic: string; agentIds: number[]; transcript: Turn[]; minutes: string; closed: boolean; createdAt: number }
export interface Decision { id?: number; title: string; description: string; status: 'in attesa' | 'approvata' | 'rifiutata'; createdAt: number }
export interface LogEntry { id?: number; at: number; kind: string; message: string }

class HoldingDB extends Dexie {
  holding!: Table<Holding, number>
  companies!: Table<Company, number>
  departments!: Table<Department, number>
  agents!: Table<Agent, number>
  goals!: Table<Goal, number>
  projects!: Table<Project, number>
  tasks!: Table<Task, number>
  meetings!: Table<Meeting, number>
  decisions!: Table<Decision, number>
  logs!: Table<LogEntry, number>
  constructor() {
    super('ai-holding')
    this.version(1).stores({
      holding: '++id', companies: '++id', departments: '++id,companyId', agents: '++id,companyId',
      goals: '++id', projects: '++id,companyId', tasks: '++id,projectId,agentId,status',
      meetings: '++id', decisions: '++id,status', logs: '++id,at',
    })
  }
}
export const db = new HoldingDB()

export const log = (kind: string, message: string) => db.logs.add({ at: Date.now(), kind, message })

export async function seed() {
  if ((await db.holding.count()) > 0) return
  await db.holding.add({ name: 'AI Holding', mission: 'Far crescere societa virtuali gestite da agenti AI.' })
  const nova = await db.companies.add({ name: 'Nova Digital', description: 'Agenzia di marketing e vendite online.' })
  const orbita = await db.companies.add({ name: 'Orbita Studio', description: 'Studio di prodotto software con finanza interna.' })
  const dMk = await db.departments.add({ companyId: nova, name: 'Marketing' })
  const dVe = await db.departments.add({ companyId: nova, name: 'Vendite' })
  const dPr = await db.departments.add({ companyId: orbita, name: 'Prodotto' })
  const dFi = await db.departments.add({ companyId: orbita, name: 'Finanza' })
  const ceo = await db.agents.add({ name: 'Livia Conti', role: 'CEO della holding', instructions: 'Scomponi gli obiettivi in progetti e task concreti e assegnali alle societa. Sii sintetica e pratica.', companyId: 0, departmentId: 0, managerId: 0 })
  await db.agents.add({ name: 'Marco Villa', role: 'Responsabile Marketing', instructions: 'Pianifica campagne e contenuti a basso budget. Rispondi in modo operativo.', companyId: nova, departmentId: dMk, managerId: ceo })
  await db.agents.add({ name: 'Sara Neri', role: 'Responsabile Vendite', instructions: 'Definisci pipeline, offerte e script di vendita. Rispondi con passi concreti.', companyId: nova, departmentId: dVe, managerId: ceo })
  await db.agents.add({ name: 'Paolo Riva', role: 'Product Manager', instructions: 'Trasforma idee in requisiti e priorita. Rispondi con elenchi brevi.', companyId: orbita, departmentId: dPr, managerId: ceo })
  await db.agents.add({ name: 'Elena Gatti', role: 'CFO', instructions: 'Valuta costi, ricavi e rischi finanziari. Segnala sempre le decisioni che richiedono approvazione.', companyId: orbita, departmentId: dFi, managerId: ceo })
  await db.goals.add({ title: 'Lanciare un nuovo prodotto entro 3 mesi', status: 'attivo' })
  await db.decisions.add({ title: 'Budget marketing Q1', description: 'Approvare 5.000 EUR di budget per Nova Digital.', status: 'in attesa', createdAt: Date.now() })
  await log('sistema', 'Dati demo creati.')
}
