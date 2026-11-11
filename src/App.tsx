import { NavLink, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { geminiStatus } from './ai'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import Agents from './pages/Agents'
import Work from './pages/Work'
import Meetings from './pages/Meetings'
import Control from './pages/Control'

const links = [['/', 'Holding'], ['/societa', 'Società'], ['/agenti', 'Agenti'], ['/lavoro', 'Lavoro'], ['/riunioni', 'Riunioni'], ['/controllo', 'Controllo']]

export default function App() {
  const [st, setSt] = useState<{ ok: boolean; model?: string; error?: string } | null>(null)
  useEffect(() => { geminiStatus().then(setSt) }, [])
  return (
    <div className="flex flex-col md:flex-row h-screen">
      <nav className="md:w-48 bg-slate-900 text-slate-200 p-2 md:p-3 md:space-y-1 shrink-0 flex flex-wrap md:block items-center gap-1 md:overflow-auto">
        <div className="font-bold text-white mr-2 md:mb-3">AI Holding</div>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => 'block rounded px-2 md:px-3 py-1 md:py-2 ' + (isActive ? 'bg-slate-700 text-white' : 'hover:bg-slate-800')}>{label}</NavLink>
        ))}
        <div className="text-xs md:pt-4 text-slate-400 w-full">{st ? (st.ok ? 'Gemini: ' + st.model : 'Gemini non configurato') : ''}</div>
      </nav>
      <main className="flex-1 overflow-auto min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/societa" element={<Companies />} />
          <Route path="/agenti" element={<Agents />} />
          <Route path="/lavoro" element={<Work />} />
          <Route path="/riunioni" element={<Meetings />} />
          <Route path="/controllo" element={<Control />} />
        </Routes>
      </main>
    </div>
  )
}

