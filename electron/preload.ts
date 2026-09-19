import { contextBridge, ipcRenderer } from 'electron'
import type { CalendarMark, CalendarMarkApi, DesktopApi, JournalApi, TodoApi, TodoInput, TodoPatch } from './types.js'

const api: TodoApi = {
  list: () => ipcRenderer.invoke('todos:list'),
  create: (input: TodoInput) => ipcRenderer.invoke('todos:create', input),
  update: (id: string, patch: TodoPatch) => ipcRenderer.invoke('todos:update', id, patch),
  remove: (id: string) => ipcRenderer.invoke('todos:remove', id),
}

contextBridge.exposeInMainWorld('todoApi', api)

const journalApi: JournalApi = {
  list: () => ipcRenderer.invoke('journal:list'),
  save: (date: string, content: string) => ipcRenderer.invoke('journal:save', date, content),
  clear: (date: string) => ipcRenderer.invoke('journal:clear', date),
}
contextBridge.exposeInMainWorld('journalApi', journalApi)

const desktopApi: DesktopApi = {
  setCompact: (compact) => ipcRenderer.invoke('window:set-compact', compact),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('window:set-always-on-top', enabled),
  setSize: (width, height) => ipcRenderer.invoke('window:set-size', width, height),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  hide: () => ipcRenderer.invoke('window:hide'),
  chooseBackground: () => ipcRenderer.invoke('background:choose'),
  getBackground: () => ipcRenderer.invoke('background:get'),
  onExpanded: (callback) => { ipcRenderer.on('window:expanded', () => callback()) },
}
contextBridge.exposeInMainWorld('desktopApi', desktopApi)

const calendarMarkApi: CalendarMarkApi = {
  list: () => ipcRenderer.invoke('marks:list'),
  create: (input) => ipcRenderer.invoke('marks:create', input),
  update: (id, input) => ipcRenderer.invoke('marks:update', id, input),
  remove: (id) => ipcRenderer.invoke('marks:remove', id),
}
contextBridge.exposeInMainWorld('calendarMarkApi', calendarMarkApi)
