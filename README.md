# 答题助手 - Quiz Helper

一款桌面答题辅助工具，支持**截图识别题目 → AI 自动作答**的完整流程。

## 功能

- 📸 **截图识题** — 快捷键截图，自动 OCR 识别文字
- ✍️ **手动输入** — 也可手动输入或粘贴题目
- 🤖 **AI 解答** — 支持 OpenAI / Claude 等多种 AI 模型
- 💬 **连续追问** — 对答案不满意可继续追问
- 📋 **历史记录** — 自动保存答题记录，支持搜索

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置中转站

首次启动会自动打开设置页面，需要配置 AI 中转站：

- **Base URL** — API 地址（支持 OpenAI 兼容格式和 Claude 格式）
- **API Key** — 你的 API 密钥
- **模型** — 选择要使用的模型

### 3. 启动

```bash
npm start
```

### 默认快捷键

| 操作 | 快捷键 |
|------|--------|
| 截图识题 | `Ctrl+Shift+Q` |
| 手动输入 | `Ctrl+Shift+A` |

## 技术栈

| 技术 | 用途 |
|------|------|
| **Electron** | 桌面应用框架 |
| **OpenAI SDK** | OpenAI 兼容 API 调用 |
| **Anthropic SDK** | Claude API 调用 |
| **Tesseract OCR** | 文字识别 |
| **electron-store** | 本地配置存储 |

## 项目结构

```
quiz-helper/
├── main.js              # 主进程
├── preload.js           # 预加载脚本
├── src/
│   ├── ai-adapter.js    # AI 适配层（统一 OpenAI / Claude 接口）
│   ├── ocr.js           # OCR 识别模块
│   ├── screenshot.js    # 截图模块
│   ├── stations.js      # 中转站管理
│   ├── history.js       # 历史记录
│   └── tray.js          # 系统托盘
└── renderer/
    ├── answer/          # 答案展示窗口
    ├── confirm/         # OCR 确认窗口
    ├── history/         # 历史记录窗口
    ├── input/           # 手动输入窗口
    ├── overlay/         # 截图遮罩层
    └── settings/        # 设置页面
```

## 许可

MIT License
