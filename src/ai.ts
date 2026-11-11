import { db, log, Agent } from './db'

export const geminiStatus = (): Promise<{ ok: boolean; model?: string; error?: string }> =>
  fetch('/api/gemini').then((r) => r.json()).catch(() => ({ ok: false, error: 'Server non raggiungibile.' }))

async function generate(system: string, prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const r = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, prompt }) })
    return await r.json()
  } catch { return { ok: false, error: 'Server non raggiungibile.' } }
}

// Orchestratore: un solo agente per chiamata, solo su richiesta esplicita dell'utente.
export async function runAgent(agent: Agent, prompt: string, context = ''): Promise<{ ok: boolean; text: string }> {
  const system = `Sei ${agent.name}, ${agent.role}. Istruzioni: ${agent.instructions}\nRispondi in italiano.` + (context ? `\nContesto: ${context}` : '')
  const r = await generate(system, prompt)
  if (r.ok && r.text) { await log('agente', `${agent.name} ha risposto (${r.text.length} caratteri).`); return { ok: true, text: r.text } }
  await log('errore', `${agent.name}: ${r.error}`)
  return { ok: false, text: r.error || 'Errore sconosciuto' }
}
