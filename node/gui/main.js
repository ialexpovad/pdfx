import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import path from 'node:path'
import url from 'node:url'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { promises as fsp } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win

// Single instance + forward file args
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
app.on('second-instance', (_e, argv) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    const candidate = argv.find(a => a.toLowerCase().endsWith('.pdf'))
    if (candidate) win.webContents.send('ui:action', 'open') // trigger picker; or implement direct open if desired
  }
})

// macOS open-file (double-click .pdf)
app.on('open-file', (e, _filePath) => {
  e.preventDefault()
  if (win) win.webContents.send('ui:action', 'open') // keep consistent flow
})

function resolveAddonPath() {
  const devCandidate = path.resolve(__dirname, '../addon/build/Release/pdfx.node')
  if (fs.existsSync(devCandidate)) return devCandidate
  const prodCandidate = path.join(process.resourcesPath, 'native', 'pdfx.node')
  if (fs.existsSync(prodCandidate)) return prodCandidate
  throw new Error(
    `Native addon not found.\nTried:\n  ${devCandidate}\n  ${prodCandidate}\n` +
    `Build it first: cd ../addon && npm i && npm run build`
  )
}

function loadAddonOrDie() {
  try {
    const addonPath = resolveAddonPath()
    // eslint-disable-next-line import/no-dynamic-require
    return require(addonPath)
  } catch (err) {
    console.error('[pdfx] addon load failed:', err)
    setImmediate(() => { if (win && !win.isDestroyed()) win.webContents.send('pdfx:error', String(err?.message || err)) })
    return {
      extractAll: () => { throw new Error('pdfx native addon not available') },
      extractPages: () => { throw new Error('pdfx native addon not available') }
    }
  }
}
const pdfx = loadAddonOrDie()

function createMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name, submenu: [
        { role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open PDF…', accelerator: 'CmdOrCtrl+O', click: () => win?.webContents.send('ui:action', 'open') },
        { label: 'Extract', accelerator: 'CmdOrCtrl+E', click: () => win?.webContents.send('ui:action', 'extract') },
        { label: 'Export .txt', accelerator: 'CmdOrCtrl+S', click: () => win?.webContents.send('ui:action', 'export') },
        { type: 'separator' }, process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { label: 'Help', submenu: [{ label: 'Learn More', click: () => shell.openExternal('https://podofo.sourceforge.io/') }] }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    // Light theme default background to match UI
    backgroundColor: '#f7f7fb',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 14 } : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: true,
      devTools: true
    }
  })

  // Harden navigation
  win.webContents.on('will-navigate', (e, targetURL) => {
    const allowed = targetURL.startsWith('file://')
    if (!allowed) e.preventDefault()
  })

  const index = url.pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString()
  await win.loadURL(index)
  createMenu()
}

app.whenReady().then(() => createWindow())
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ---------- IPC ----------
ipcMain.handle('pdfx:extractAll', async (_evt, filePath) => pdfx.extractAll(filePath))
ipcMain.handle('pdfx:extractPages', async (_evt, filePath, pages) => pdfx.extractPages(filePath, pages))
ipcMain.handle('dialog:openPdf', async () => {
  const owner = BrowserWindow.getFocusedWindow() ?? win ?? undefined
  const { canceled, filePaths } = await dialog.showOpenDialog(owner, {
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})
ipcMain.handle('dialog:saveText', async (_evt, defaultName, text) => {
  const owner = BrowserWindow.getFocusedWindow() ?? win ?? undefined
  const { canceled, filePath } = await dialog.showSaveDialog(owner, {
    defaultPath: defaultName || 'extracted.txt',
    filters: [{ name: 'Text', extensions: ['txt'] }]
  })
  if (canceled || !filePath) return null
  await fsp.writeFile(filePath, text, 'utf8')
  return filePath
})
