import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { JournalEntry } from './types.js'

interface JournalData { version: 1; entries: JournalEntry[] }

export class JournalStore {
  private filePath = path.join(app.getPath('userData'), 'journal.json')
  private writeQueue = Promise.resolve()

  private async read(): Promise<JournalData> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const data: unknown = JSON.parse(raw)
      if (!data || typeof data !== 'object' || !Array.isArray((data as JournalData).entries)) throw new Error('留言数据格式无效')
      return data as JournalData
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, entries: [] }
      console.error('读取留言数据失败：', error)
      throw new Error('无法读取本地留言数据，请检查数据文件。')
    }
  }

  private async write(data: JournalData): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true })
      const tempPath = `${this.filePath}.tmp`, backupPath = `${this.filePath}.bak`
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8')
      try { await fs.copyFile(this.filePath, backupPath) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('备份留言数据失败：', error)
      }
      await fs.rename(tempPath, this.filePath)
    })
    return this.writeQueue
  }

  async list(): Promise<JournalEntry[]> { return (await this.read()).entries }

  async save(date: string, content: string): Promise<JournalEntry> {
    const data = await this.read()
    const existing = data.entries.find((entry) => entry.date === date)
    const now = new Date().toISOString()
    const saved: JournalEntry = existing
      ? { ...existing, content, updatedAt: now }
      : { date, content, createdAt: now, updatedAt: now }
    data.entries = [...data.entries.filter((entry) => entry.date !== date), saved].sort((a, b) => a.date.localeCompare(b.date))
    await this.write(data)
    return saved
  }

  async clear(date: string): Promise<void> {
    const data = await this.read()
    data.entries = data.entries.filter((entry) => entry.date !== date)
    await this.write(data)
  }
}
