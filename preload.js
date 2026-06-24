const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // 截图流程
  onScreenshotSelected: (cb) => ipcRenderer.on('screenshot-selected', (_, rect) => cb(rect)),
  submitRegion: (rect) => ipcRenderer.send('submit-region', rect),
  cancelScreenshot: () => ipcRenderer.send('cancel-screenshot'),

  // 手动输入
  submitText: (text) => ipcRenderer.send('submit-text', text),
  closeInput: () => ipcRenderer.send('close-input'),

  // OCR 确认
  onOcrResult: (cb) => ipcRenderer.on('ocr-result', (_, data) => cb(data)),
  confirmOcr: (text) => ipcRenderer.send('confirm-ocr', text),
  cancelOcr: () => ipcRenderer.send('cancel-ocr'),

  // AI 答案
  onAiChunk: (cb) => ipcRenderer.on('ai-chunk', (_, chunk) => cb(chunk)),
  onAiDone: (cb) => ipcRenderer.on('ai-done', (_, answer) => cb(answer)),
  onAiError: (cb) => ipcRenderer.on('ai-error', (_, msg) => cb(msg)),
  followUp: (text) => ipcRenderer.send('follow-up', text),
  regenerate: () => ipcRenderer.send('regenerate'),
  closeAnswer: () => ipcRenderer.send('close-answer'),

  // 历史记录
  getHistory: (kw) => ipcRenderer.invoke('get-history', kw),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // 设置
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),
  getStations: () => ipcRenderer.invoke('get-stations'),
  addStation: (s) => ipcRenderer.invoke('add-station', s),
  updateStation: (id, s) => ipcRenderer.invoke('update-station', id, s),
  removeStation: (id) => ipcRenderer.invoke('remove-station', id),
  setActiveStation: (id) => ipcRenderer.invoke('set-active-station', id),
  getActiveStation: () => ipcRenderer.invoke('get-active-station'),

  // 获取模型列表
  fetchModels: (data) => ipcRenderer.invoke('fetch-models', data),

  // 工具
  copyText: (text) => ipcRenderer.send('copy-text', text),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
})
