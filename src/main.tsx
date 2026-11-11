import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { seed } from './db'
import { syncStart } from './sync'
import './index.css'

syncStart(seed).finally(() => createRoot(document.getElementById('root')!).render(<HashRouter><App /></HashRouter>))

