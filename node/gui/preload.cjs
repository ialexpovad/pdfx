const { contextBridge, ipcRenderer } = require('electron')

/** Strict, whitelisted IPC bridge */
const api = {
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
  }
}

contextBridge.exposeInMainWorld('pdfx', api)
