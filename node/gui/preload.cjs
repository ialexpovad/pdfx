const { contextBridge, ipcRenderer } = require('electron')

/** Strict, whitelisted IPC bridge */
const api = {
  // Expose platform for CSS/layout tweaks (e.g., traffic lights padding on macOS)
  platform: process.platform,

  selectPdf: () => ipcRenderer.invoke('dialog:openPdf'),
  extractAll: (filePath) => ipcRenderer.invoke('pdfx:extractAll', String(filePath)),
  extractPages: (filePath, pages) => {
    if (!Array.isArray(pages)) throw new TypeError('pages must be an array of zero-based indices')
    return ipcRenderer.invoke('pdfx:extractPages', String(filePath), pages.map(Number))
  },
  saveText: (defaultName, text) => ipcRenderer.invoke('dialog:saveText', String(defaultName), String(text)),
  onError: (cb) => {
    if (typeof cb !== 'function') return () => {}
    ipcRenderer.on('pdfx:error', (_evt, msg) => cb(msg))
    return () => ipcRenderer.removeAllListeners('pdfx:error')
  },
  onAction: (cb) => {
    if (typeof cb !== 'function') return () => {}
    ipcRenderer.on('ui:action', (_evt, name) => cb(name))
    return () => ipcRenderer.removeAllListeners('ui:action')
  }
}

contextBridge.exposeInMainWorld('pdfx', api)
