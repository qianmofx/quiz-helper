const Tesseract = require('tesseract.js')
const path = require('path')

// 支持语言列表
const SUPPORTED_LANGS = {
  'chi_sim+eng': '中文+英文（推荐）',
  'chi_sim':     '中文简体',
  'chi_tra':     '中文繁体',
  'eng':         '英文',
  'jpn':         '日文',
  'kor':         '韩文',
}

// 识别单张图片
async function recognize(imagePath) {
  const lang = 'chi_sim+eng'
  const { data } = await Tesseract.recognize(imagePath, lang)
  const text = data.text.trim()

  if (!text) {
    throw new Error('截图区域未识别到文字，请框选更大的区域后重试')
  }

  return { text, source: 'tesseract' }
}

// 检测 tesseract.js 是否可用（始终返回 true）
async function checkAvailable() {
  return true
}

module.exports = { recognize, checkAvailable, SUPPORTED_LANGS }
