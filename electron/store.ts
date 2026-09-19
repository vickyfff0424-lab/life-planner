import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Todo, TodoInput, TodoPatch } from './types.js'

interface StoreData { version: 1; todos: Todo[] }
const emptyStore = (): StoreData => ({ version: 1, todos: [] })

export class TodoStore {
  private filePath = path.join(app.getPath('userData'), 'todos.json')
  private writeQueue = Promise.resolve()

  private async read(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const data: unknown = JSON.parse(raw)
      if (!data || typeof data !== 'object' || !Array.isArray((data as StoreData).todos)) {
        throw new Error('数据文件格式无效')
      }
      return data as StoreData
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyStore()
      console.error('读取任务数据失败：', error)
      throw new Error('无法读取本地任务数据，请检查数据文件。')
    }
  }

  private async write(data: StoreData): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true })
      const tempPath = `${this.filePath}.tmp`
      const backupPath = `${this.filePath}.bak`
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
      try { await fs.copyFile(this.filePath, backupPath) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('备份任务数据失败：', error)
      }
      await fs.rename(tempPath, this.filePath)
    })
    return this.writeQueue
  }

  async list(): Promise<Todo[]> { return (await this.read()).todos }

  async create(input: TodoInput): Promise<Todo> {
    const data = await this.read()
    const now = new Date().toISOString()
    const todo: Todo = { ...input, id: crypto.randomUUID(), completed: false, createdAt: now, updatedAt: now }
    data.todos.push(todo)
    await this.write(data)
    return todo
  }

  async update(id: string, patch: TodoPatch): Promise<Todo> {
    const data = await this.read()
    const index = data.todos.findIndex((todo) => todo.id === id)
    if (index < 0) throw new Error('任务不存在或已被删除。')
    const previous = data.todos[index]
    const reminderChanged = patch.date !== undefined || patch.time !== undefined || patch.reminder !== undefined
    const updated: Todo = {
      ...previous, ...patch, id: previous.id, createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
      notifiedAt: reminderChanged ? undefined : previous.notifiedAt,
    }
    data.todos[index] = updated
    await this.write(data)
    return updated
  }

  async remove(id: string): Promise<void> {
    const data = await this.read()
    const length = data.todos.length
    data.todos = data.todos.filter((todo) => todo.id !== id)
    if (data.todos.length === length) throw new Error('任务不存在或已被删除。')
    await this.write(data)
  }

  async markNotified(id: string, notifiedAt: string): Promise<void> {
    const data = await this.read()
    const todo = data.todos.find((item) => item.id === id)
    if (!todo) return
    todo.notifiedAt = notifiedAt
    todo.updatedAt = new Date().toISOString()
    await this.write(data)
  }
}
