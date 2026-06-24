const Store = require('electron-store')
const { v4: uuidv4 } = require('uuid')

let store

function getStore() {
  if (!store) {
    store = new Store({ name: 'config' })
  }
  return store
}

const Stations = {
  getAll() {
    return getStore().get('stations', [])
  },

  getActive() {
    const id = getStore().get('activeStationId')
    return this.getAll().find(s => s.id === id) || this.getAll()[0] || null
  },

  setActive(id) {
    getStore().set('activeStationId', id)
  },

  add(station) {
    const list = this.getAll()
    const newStation = { ...station, id: uuidv4() }
    list.push(newStation)
    getStore().set('stations', list)
    if (list.length === 1) getStore().set('activeStationId', newStation.id)
    return newStation
  },

  update(id, data) {
    const list = this.getAll().map(s => s.id === id ? { ...s, ...data } : s)
    getStore().set('stations', list)
  },

  remove(id) {
    const list = this.getAll().filter(s => s.id !== id)
    getStore().set('stations', list)
    if (getStore().get('activeStationId') === id) {
      getStore().set('activeStationId', list[0]?.id || null)
    }
  }
}

module.exports = Stations
