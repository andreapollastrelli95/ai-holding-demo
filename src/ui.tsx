import { ReactNode, useState } from 'react'

export const Page = ({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) => (
  <div className="p-3 md:p-6 space-y-4">
    <div className="flex flex-wrap gap-2 items-center justify-between"><h1 className="text-xl font-semibold">{title}</h1><div className="flex gap-2">{actions}</div></div>
    {children}
  </div>
)
export const Card = ({ children, title }: { children: ReactNode; title?: string }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">{title && <h2 className="font-semibold">{title}</h2>}{children}</div>
)
export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1"><span className="text-xs text-slate-500">{label}</span>{children}</label>
)
export const Err = ({ msg }: { msg: string }) => msg ? <div className="bg-red-50 text-red-700 border border-red-200 rounded p-2">{msg}</div> : null

// Hook per eseguire una chiamata AI mostrando un errore chiaro senza bloccare l'app.
export function useBusy() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(String((e as Error).message || e)) } finally { setBusy(false) }
  }
  return { busy, error, setError, run }
}


export const sure = (what: string) => window.confirm('Eliminare ' + what + '? L\'operazione non si può annullare.')

