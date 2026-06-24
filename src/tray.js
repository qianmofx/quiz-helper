const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')
const Stations = require('./stations')

let tray = null
let openWindowCallbacks = {}

function createTray(callbacks) {
  openWindowCallbacks = callbacks

  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('答题助手')
  refreshMenu()
  return tray
}

function refreshMenu() {
  if (!tray) return
  const stations = Stations.getAll()
  const active = Stations.getActive()

  const stationItems = stations.length > 0
    ? stations.map(s => ({
        label: `${s.name}  [${s.format === 'claude' ? 'Claude' : 'OpenAI'}]`,
        type: 'radio',
        checked: s.id === active?.id,
        click: () => {
          Stations.setActive(s.id)
          refreshMenu()
        }
      }))
    : [{ label: '暂无中转站，请先配置', enabled: false }]

  const menu = Menu.buildFromTemplate([
    { label: '答题助手', enabled: false },
    { type: 'separator' },
    { label: '截图解答  Ctrl+Shift+Q', click: () => openWindowCallbacks.screenshot?.() },
    { label: '输入解答  Ctrl+Shift+A', click: () => openWindowCallbacks.input?.() },
    { type: 'separator' },
    { label: '切换中转站', submenu: stationItems },
    { type: 'separator' },
    { label: '历史记录', click: () => openWindowCallbacks.history?.() },
    { label: '设置', click: () => openWindowCallbacks.settings?.() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ])

  tray.setContextMenu(menu)
}

module.exports = { createTray, refreshMenu }
