const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, screen, dialog } = require('electron')
const path = require('path')
const Store = require('electron-store')
const Stations = require('./src/stations')
const History = require('./src/history')
const { createTray, refreshMenu } = require('./src/tray')
const { captureRegion } = require('./src/screenshot')
const { recognize } = require('./src/ocr')
const { streamAnswer } = require('./src/ai-adapter')

const cfgStore = new Store({ name: 'config' })

// 窗口引用
let overlayWin = null
let inputWin = null
let confirmWin = null
let answerWin = null
let historyWin = null
let settingsWin = null

// 当前解题上下文
let currentMessages = []
let currentQuestion = ''
let lastAnswer = ''

// ── 窗口尺寸常量 ──
const WIN = {
  input:    { width: 520, height: 300 },
  confirm:  { width: 540, height: 300 },
  answer:   { width: 520, height: 480 },
  history:  { width: 720, height: 560 },
  settings: { width: 760, height: 600 }
}

function makeWin(opts) {
  return new BrowserWindow({
    ...opts,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
}

// ── 各窗口创建函数 ──

function openOverlay() {
  if (overlayWin) { overlayWin.focus(); return }
  const display = screen.getPrimaryDisplay()
  overlayWin = makeWin({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false
  })
  overlayWin.loadFile(path.join(__dirname, 'renderer/overlay/index.html'))
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.on('closed', () => { overlayWin = null })
}

function openInput() {
  if (inputWin) { inputWin.focus(); return }
  inputWin = makeWin({
    ...WIN.input,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false
  })
  inputWin.loadFile(path.join(__dirname, 'renderer/input/index.html'))
  inputWin.center()
  inputWin.on('closed', () => { inputWin = null })
}

function openConfirm(ocrText, source) {
  if (confirmWin) confirmWin.close()
  confirmWin = makeWin({
    ...WIN.confirm,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false
  })
  confirmWin.loadFile(path.join(__dirname, 'renderer/confirm/index.html'))
  confirmWin.center()
  confirmWin.webContents.once('did-finish-load', () => {
    confirmWin.webContents.send('ocr-result', { text: ocrText, source })
  })
  confirmWin.on('closed', () => { confirmWin = null })
}

function openAnswer() {
  if (answerWin) {
    answerWin.focus()
    return
  }
  answerWin = makeWin({
    ...WIN.answer,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: true,
    minWidth: 380,
    minHeight: 300
  })
  answerWin.loadFile(path.join(__dirname, 'renderer/answer/index.html'))
  answerWin.center()
  answerWin.on('closed', () => {
    answerWin = null
    currentMessages = []
    currentQuestion = ''
    lastAnswer = ''
  })
}

function openHistory() {
  if (historyWin) { historyWin.focus(); return }
  historyWin = makeWin({ ...WIN.history, frame: false, resizable: true })
  historyWin.loadFile(path.join(__dirname, 'renderer/history/index.html'))
  historyWin.center()
  historyWin.on('closed', () => { historyWin = null })
}

function openSettings() {
  if (settingsWin) { settingsWin.focus(); return }
  settingsWin = makeWin({ ...WIN.settings, frame: false, resizable: true })
  settingsWin.loadFile(path.join(__dirname, 'renderer/settings/index.html'))
  settingsWin.center()
  settingsWin.on('closed', () => { settingsWin = null })
}

// ── 核心流程：拿到题目文字后触发 AI ──

const DEFAULT_PROMPT = '你是一个解题专家。用户的问题可能来自OCR识别，可能存在缺字、错字或不完整的情况。请先根据上下文合理补充和修正题目，然后再给出清晰的解题步骤和答案。用中文作答。'

async function startSolve(question) {
  currentQuestion = question
  currentMessages = [{ role: 'user', content: question }]
  lastAnswer = ''
  openAnswer()
  await runCurrentMessages()
}

async function runCurrentMessages() {
  const station = Stations.getActive()
  const systemPrompt = cfgStore.get('systemPrompt', DEFAULT_PROMPT)
  await runStream(station, currentMessages, systemPrompt)
}

async function runStream(station, messages, systemPrompt) {
  if (!answerWin) return
  answerWin.webContents.send('ai-chunk', '')  // 清空旧内容信号

  let fullAnswer = ''
  try {
    const gen = streamAnswer(station, messages, systemPrompt)
    for await (const chunk of gen) {
      fullAnswer += chunk
      if (answerWin) answerWin.webContents.send('ai-chunk', chunk)
    }
    lastAnswer = fullAnswer
    currentMessages.push({ role: 'assistant', content: fullAnswer })
    // 超过 10 轮截断（保留最新 10 条）
    if (currentMessages.length > 10) {
      currentMessages = currentMessages.slice(currentMessages.length - 10)
    }
    if (answerWin) answerWin.webContents.send('ai-done', fullAnswer)
    History.save(currentQuestion, fullAnswer)
  } catch (err) {
    if (answerWin) answerWin.webContents.send('ai-error', err.message)
  }
}

// ── IPC 处理 ──

// 截图区域提交
ipcMain.on('submit-region', async (_, rect) => {
  if (overlayWin) { overlayWin.close(); overlayWin = null }
  try {
    const imgPath = await captureRegion(rect)
    const { text, source } = await recognize(imgPath)
    const confirmEnabled = cfgStore.get('ocrConfirm', true)
    if (confirmEnabled) {
      openConfirm(text, source)
    } else {
      await startSolve(text)
    }
  } catch (err) {
    dialog.showErrorBox('截图识别失败', err.stack || err.message)
  }
})

ipcMain.on('cancel-screenshot', () => {
  if (overlayWin) { overlayWin.close(); overlayWin = null }
})

// 手动输入提交
ipcMain.on('submit-text', async (_, text) => {
  if (inputWin) { inputWin.close(); inputWin = null }
  if (text?.trim()) await startSolve(text.trim())
})

ipcMain.on('close-input', () => {
  if (inputWin) { inputWin.close(); inputWin = null }
})

// OCR 确认
ipcMain.on('confirm-ocr', async (_, text) => {
  if (confirmWin) { confirmWin.close(); confirmWin = null }
  if (text?.trim()) await startSolve(text.trim())
})

ipcMain.on('cancel-ocr', () => {
  if (confirmWin) { confirmWin.close(); confirmWin = null }
})

// 追问
ipcMain.on('follow-up', async (_, text) => {
  if (!text?.trim()) return
  currentMessages.push({ role: 'user', content: text.trim() })
  await runCurrentMessages()
})

// 重新生成
ipcMain.on('regenerate', async () => {
  // 移除最后一个 assistant 回复，重新请求
  if (currentMessages.length > 0 && currentMessages[currentMessages.length - 1].role === 'assistant') {
    currentMessages.pop()
  }
  await runCurrentMessages()
})

ipcMain.on('close-answer', () => {
  if (answerWin) { answerWin.close(); answerWin = null }
})

ipcMain.on('copy-text', (_, text) => {
  clipboard.writeText(text)
})

// 历史记录
ipcMain.handle('get-history', (_, kw) => History.search(kw))
ipcMain.handle('clear-history', () => History.clear())

// 配置读写
ipcMain.handle('get-config', () => cfgStore.store)
ipcMain.handle('save-config', (_, data) => {
  Object.entries(data).forEach(([k, v]) => cfgStore.set(k, v))
  // 快捷键变更后重新注册
  registerHotkeys()
  // 开机自启
  if ('openAtLogin' in data) {
    app.setLoginItemSettings({ openAtLogin: !!data.openAtLogin })
  }
})

// 获取中转站支持的模型列表
ipcMain.handle('fetch-models', async (_, { format, baseURL, apiKey }) => {
  if (!baseURL || !apiKey) throw new Error('请先填写 Base URL 和 API Key')
  const base = baseURL.replace(/\/+$/, '')

  if (format === 'claude') {
    // Anthropic: /v1/models
    const url = base.includes('/v1') ? `${base}/models` : `${base}/v1/models`
    const res = await fetch(url, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `请求失败 ${res.status}`)
    return (data.data || []).map(m => m.id).sort()
  } else {
    // OpenAI 兼容：baseURL 通常已含 /v1，直接拼 /models
    const url = `${base}/models`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `请求失败 ${res.status}`)
    return (data.data || []).map(m => m.id).sort()
  }
})

// 中转站
ipcMain.handle('get-stations', () => Stations.getAll())
ipcMain.handle('add-station', (_, s) => Stations.add(s))
ipcMain.handle('update-station', (_, id, s) => Stations.update(id, s))
ipcMain.handle('remove-station', (_, id) => Stations.remove(id))
ipcMain.handle('set-active-station', (_, id) => { Stations.setActive(id); refreshMenu() })
ipcMain.handle('get-active-station', () => Stations.getActive())

// ── 快捷键注册 ──

function registerHotkeys() {
  globalShortcut.unregisterAll()
  const hkShot = cfgStore.get('hotkeyScreenshot', 'Ctrl+Shift+Q')
  const hkInput = cfgStore.get('hotkeyInput', 'Ctrl+Shift+A')

  try { globalShortcut.register(hkShot, openOverlay) } catch(e) { console.warn('热键注册失败:', hkShot) }
  try { globalShortcut.register(hkInput, openInput) } catch(e) { console.warn('热键注册失败:', hkInput) }
}

// ── 应用启动 ──

app.whenReady().then(async () => {
  createTray({
    screenshot: openOverlay,
    input: openInput,
    history: openHistory,
    settings: openSettings
  })

  registerHotkeys()

  // 首次启动提示配置中转站
  if (Stations.getAll().length === 0) {
    setTimeout(openSettings, 800)
  }
})

app.on('will-quit', () => globalShortcut.unregisterAll())

// 阻止所有窗口关闭时退出（托盘常驻）
app.on('window-all-closed', (e) => e.preventDefault())
