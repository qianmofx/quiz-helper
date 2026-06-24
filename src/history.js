const Store = require('electron-store')

let store

function getStore() {
  if (!store) store = new Store({ name: 'history' })
  return store
}

const MAX_RECORDS = 200

const History = {
  getAll() {
    return getStore().get('records', [])
  },

  save(question, answer) {
    const records = this.getAll()
    records.unshift({
      id: Date.now(),
      question,
      answer,
      time: new Date().toLocaleString('zh-CN')
    })
    getStore().set('records', records.slice(0, MAX_RECORDS))
  },

  search(keyword) {
    if (!keyword) return this.getAll()
    const kw = keyword.toLowerCase()
    return this.getAll().filter(r =>
      r.question.toLowerCase().includes(kw) ||
      r.answer.toLowerCase().includes(kw)
    )
  },

  clear() {
    getStore().set('records', [])
  }
}

module.exports = History
