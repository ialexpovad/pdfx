import { app, BrowserWindow, ipcMain, dialog } from 'electron'
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

// Single instance (forward argv PDFs to the first instance)
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
app.on('second-instance', (_e, argv) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
  // (Optional) you could parse argv here and send to renderer.
})

function resolveAddonPath() {
  const candidate = path.resolve(__dirname, '../addon/build/Release/pdfx.node')
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `Native addon not found at ${candidate}. Build first:\n  cd ../addon && npm i && npm run build`
    )
  }
  return candidate
}

function loadAddonOrDie() {
  try {
    const addonPath = resolveAddonPath()
    // eslint-disable-next-line import/no-dynamic-require
    return require(addonPath)
  } catch (err) {
    console.error('[pdfx] addon load failed:', err)
    // Defer error to renderer via IPC once a window exists
    setImmediate(() => {
      if (win && !win.isDestroyed()) win.webContents.send('pdfx:error', String(err?.message || err))
    })
    // Provide stubs that throw for IPC safety
    return {
      extractAll: () => { throw new Error('pdfx native addon not available') },
      extractPages: () => { throw new Error('pdfx native addon not available') }
    }
  }
}

const pdfx = loadAddonOrDie()

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0b0c',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs') // <- CJS preload
    }
  })

  const index = url.pathToFileURL(path.join(__dirname, 'renderer', 'index.html')).toString()
  await win.loadURL(index)
}

app.whenReady().then(async () => {
  await createWindow()
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

// ---------- IPC ----------
ipcMain.handle('pdfx:extractAll', async (_evt, filePath) => {
  return pdfx.extractAll(filePath)
})

ipcMain.handle('pdfx:extractPages', async (_evt, filePath, pages) => {
  return pdfx.extractPages(filePath, pages)
})

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
