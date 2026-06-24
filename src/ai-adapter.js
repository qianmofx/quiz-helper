// 统一 AI 适配层：屏蔽 OpenAI 与 Claude 格式差异
// 对外统一暴露 streamAnswer(station, messages, systemPrompt)
// 返回 AsyncGenerator，每次 yield 一段文字 chunk

async function* streamAnswer(station, messages, systemPrompt) {
  if (!station) throw new Error('未配置中转站，请先在设置中添加')

  if (station.format === 'claude') {
    yield* streamClaude(station, messages, systemPrompt)
  } else {
    yield* streamOpenAI(station, messages, systemPrompt)
  }
}

async function* streamOpenAI(station, messages, systemPrompt) {
  const { OpenAI } = require('openai')
  const client = new OpenAI({
    baseURL: station.baseURL,
    apiKey: station.apiKey
  })

  const fullMessages = [
    { role: 'system', content: systemPrompt || '你是一个解题专家，请给出清晰的解题步骤和答案。' },
    ...messages
  ]

  const stream = await client.chat.completions.create({
    model: station.model,
    stream: true,
    messages: fullMessages
  })

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content
    if (text) yield text
  }
}

async function* streamClaude(station, messages, systemPrompt) {
  const Anthropic = require('@anthropic-ai/sdk')
  const client = new Anthropic({
    baseURL: station.baseURL,
    apiKey: station.apiKey,
    defaultHeaders: { 'anthropic-version': '2023-06-01' }
  })

  // Claude messages 数组只含 user / assistant，system 单独传
  const claudeMessages = messages.map(m => ({
    role: m.role === 'system' ? 'user' : m.role,
    content: m.content
  }))

  const stream = client.messages.stream({
    model: station.model,
    max_tokens: 4096,
    system: systemPrompt || '你是一个解题专家，请给出清晰的解题步骤和答案。',
    messages: claudeMessages
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

module.exports = { streamAnswer }
