import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, screen, Tray } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TodoStore } from './store.js'
import { JournalStore } from './journalStore.js'
import { CalendarMarkStore } from './calendarMarkStore.js'
import type { CalendarMark, TodoInput, TodoPatch } from './types.js'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let reminderTimer: NodeJS.Timeout | null = null
let expandedBounds = { width: 760, height: 640, x: 0, y: 0 }
const isSmokeTest = process.argv.includes('--smoke-test')
if (isSmokeTest) app.disableHardwareAcceleration()

const validateInput = (input: TodoInput): void => {
  if (!input || typeof input.title !== 'string' || !input.title.trim()) throw new Error('标题不能为空。')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('日期格式无效。')
  if (!/^\d{2}:\d{2}$/.test(input.time)) throw new Error('时间格式无效。')
  if (!['high', 'medium', 'low'].includes(input.priority)) throw new Error('优先级无效。')
  if (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== 'string')) throw new Error('标签格式无效。')
}

const validateDateKey = (date: string): void => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new Error('日期格式无效。')
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const value = new Date(year, month - 1, day, 12)
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) throw new Error('日期无效。')
}

const createWindow = (): void => {
  const smokeTest = isSmokeTest
  mainWindow = new BrowserWindow({
    width: 760, height: 640, minWidth: 420, minHeight: 480,
    title: '我的日程', backgroundColor: '#00000000', transparent: true, frame: false, show: !smokeTest,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.on('close', (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow?.hide() }
  })
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return
    const area = screen.getDisplayMatching(mainWindow.getBounds()).workArea
    mainWindow.setPosition(Math.max(area.x, area.x + area.width - 780), area.y + Math.max(20, Math.round((area.height - 640) / 2)))
    expandedBounds = mainWindow.getBounds()
  })
  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) void mainWindow.loadURL(devUrl)
  else void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  if (smokeTest) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('SMOKE_TEST_OK: 生产页面已成功加载')
      isQuitting = true
      setTimeout(() => app.quit(), 300)
    })
    mainWindow.webContents.once('did-fail-load', (_event, code, description) => {
      console.error(`SMOKE_TEST_FAILED: ${code} ${description}`)
      process.exitCode = 1
      isQuitting = true
      app.quit()
    })
  }
}

const createTray = (): void => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#3b82f6"/><path d="M9 16l4 4 10-10" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('我的日程')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开应用', click: () => expandMainWindow() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on('double-click', () => expandMainWindow())
}

const expandMainWindow = (): void => {
  if (!mainWindow) return
  const area = screen.getDisplayMatching(mainWindow.getBounds()).workArea
  mainWindow.setBounds({ ...expandedBounds, x: Math.max(area.x, Math.min(expandedBounds.x, area.x + area.width - expandedBounds.width)), y: Math.max(area.y, Math.min(expandedBounds.y, area.y + area.height - expandedBounds.height)) }, true)
  mainWindow.setMinimumSize(420, 480)
  mainWindow.show(); mainWindow.focus()
  mainWindow.webContents.send('window:expanded')
}

app.whenReady().then(() => {
  const store = new TodoStore()
  const journalStore = new JournalStore()
  const markStore = new CalendarMarkStore()
  ipcMain.handle('todos:list', () => store.list())
  ipcMain.handle('todos:create', (_event, input: TodoInput) => { validateInput(input); return store.create({ ...input, title: input.title.trim(), description: input.description.trim(), tags: input.tags.map((tag) => tag.trim()).filter(Boolean) }) })
  ipcMain.handle('todos:update', async (_event, id: string, patch: TodoPatch) => {
    if (typeof id !== 'string') throw new Error('任务编号无效。')
    const current = (await store.list()).find((todo) => todo.id === id)
    if (!current) throw new Error('任务不存在。')
    const merged = { ...current, ...patch }
    validateInput(merged)
    return store.update(id, patch)
  })
  ipcMain.handle('todos:remove', (_event, id: string) => store.remove(id))
  ipcMain.handle('journal:list', () => journalStore.list())
  ipcMain.handle('journal:save', (_event, date: string, content: string) => {
    validateDateKey(date)
    if (typeof content !== 'string') throw new Error('留言内容格式无效。')
    return journalStore.save(date, content)
  })
  ipcMain.handle('journal:clear', (_event, date: string) => { validateDateKey(date); return journalStore.clear(date) })
  const validateMark = (input: Pick<CalendarMark, 'date' | 'title' | 'repeat' | 'color'>) => {
    validateDateKey(input.date)
    if (!input.title?.trim()) throw new Error('标注名称不能为空。')
    if (!['none', 'yearly'].includes(input.repeat) || !['blue', 'rose', 'amber', 'green'].includes(input.color)) throw new Error('标注设置无效。')
  }
  ipcMain.handle('marks:list', () => markStore.list())
  ipcMain.handle('marks:create', (_event, input: Pick<CalendarMark, 'date' | 'title' | 'repeat' | 'color'>) => { validateMark(input); return markStore.create({ ...input, title: input.title.trim() }) })
  ipcMain.handle('marks:update', (_event, id: string, input: Pick<CalendarMark, 'date' | 'title' | 'repeat' | 'color'>) => { validateMark(input); return markStore.update(id, { ...input, title: input.title.trim() }) })
  ipcMain.handle('marks:remove', (_event, id: string) => markStore.remove(id))
  ipcMain.handle('window:set-compact', (_event, compact: boolean) => {
    if (!mainWindow) return
    const area = screen.getDisplayMatching(mainWindow.getBounds()).workArea
    if (compact) {
      expandedBounds = mainWindow.getBounds()
      mainWindow.setMinimumSize(1, 1)
      mainWindow.setBounds({ x: area.x + area.width - 44, y: area.y + Math.round((area.height - 170) / 2), width: 44, height: 170 }, true)
    } else {
      expandMainWindow()
    }
  })
  ipcMain.handle('window:set-always-on-top', (_event, enabled: boolean) => mainWindow?.setAlwaysOnTop(Boolean(enabled), 'floating'))
  ipcMain.handle('window:set-size', (_event, width: number, height: number) => {
    if (!mainWindow || !Number.isFinite(width) || !Number.isFinite(height)) return
    const area = screen.getDisplayMatching(mainWindow.getBounds()).workArea
    const nextWidth = Math.max(420, Math.min(Math.round(width), area.width))
    const nextHeight = Math.max(480, Math.min(Math.round(height), area.height))
    const current = mainWindow.getBounds()
    mainWindow.setBounds({ x: Math.max(area.x, Math.min(current.x, area.x + area.width - nextWidth)), y: Math.max(area.y, Math.min(current.y, area.y + area.height - nextHeight)), width: nextWidth, height: nextHeight }, true)
    expandedBounds = mainWindow.getBounds()
  })
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:hide', () => mainWindow?.hide())
  const backgroundMeta = path.join(app.getPath('userData'), 'widget-background.json')
  const readBackground = async (): Promise<string | null> => {
    try {
      const meta = JSON.parse(await fs.readFile(backgroundMeta, 'utf8')) as { file: string; mime: string }
      const buffer = await fs.readFile(path.join(app.getPath('userData'), meta.file))
      return `data:${meta.mime};base64,${buffer.toString('base64')}`
    } catch { return null }
  }
  ipcMain.handle('background:get', readBackground)
  ipcMain.handle('background:choose', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, { title: '选择小组件背景图片', properties: ['openFile'], filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }] })
    if (result.canceled || !result.filePaths[0]) return null
    const source = result.filePaths[0], extension = path.extname(source).toLowerCase()
    const mime = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : extension === '.bmp' ? 'image/bmp' : 'image/jpeg'
    const file = `widget-background${extension}`
    await fs.copyFile(source, path.join(app.getPath('userData'), file))
    await fs.writeFile(backgroundMeta, JSON.stringify({ file, mime }, null, 2), 'utf8')
    return readBackground()
  })
  createWindow()
  createTray()
  reminderTimer = setInterval(async () => {
    try {
      const now = new Date()
      const due = (await store.list()).filter((todo) => {
        const at = new Date(`${todo.date}T${todo.time}:00`)
        return todo.reminder && !todo.completed && !todo.notifiedAt && at <= now
      })
      for (const todo of due) {
        new Notification({ title: '我的日程提醒', body: `${todo.time}  ${todo.title}` }).show()
        await store.markNotified(todo.id, now.toISOString())
      }
    } catch (error) { console.error('检查提醒失败：', error) }
  }, 15_000)
})

app.on('activate', () => { if (mainWindow) expandMainWindow(); else createWindow() })
app.on('before-quit', () => { isQuitting = true; if (reminderTimer) clearInterval(reminderTimer) })
app.on('window-all-closed', () => { /* 托盘应用保持运行 */ })
