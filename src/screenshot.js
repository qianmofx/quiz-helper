const { desktopCapturer, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

async function captureRegion({ x, y, width, height }) {
  const display = screen.getPrimaryDisplay()
  const scale = display.scaleFactor

  // 修正 DPI 缩放
  const realX = Math.round(x * scale)
  const realY = Math.round(y * scale)
  const realW = Math.round(width * scale)
  const realH = Math.round(height * scale)

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: display.bounds.width * scale,
      height: display.bounds.height * scale
    }
  })

  const primary = sources.find(s => s.display_id === String(display.id)) || sources[0]
  if (!primary) throw new Error('无法获取屏幕截图')

  const img = primary.thumbnail

  // 裁剪区域
  const cropped = img.crop({ x: realX, y: realY, width: realW, height: realH })
  const png = cropped.toPNG()

  // 保存到临时文件
  const tmpPath = path.join(os.tmpdir(), `answer_shot_${Date.now()}.png`)
  fs.writeFileSync(tmpPath, png)
  return tmpPath
}

module.exports = { captureRegion }
