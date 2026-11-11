const { app, BrowserWindow } = require('electron')
const path = require('path')
const { PORT, HOST } = require('../server/server.cjs') // avvia il server se non e' gia attivo (EADDRINUSE ignorato)

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 820, title: 'AI Holding', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false } })
  win.loadURL(`http://${HOST}:${PORT}`)
}
app.whenReady().then(() => setTimeout(createWindow, 300))
app.on('window-all-closed', () => app.quit())
