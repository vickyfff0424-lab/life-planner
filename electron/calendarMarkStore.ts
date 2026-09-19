import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { CalendarMark } from './types.js'

interface MarkData { version: 1; marks: CalendarMark[] }
type MarkInput = Pick<CalendarMark, 'date' | 'title' | 'repeat' | 'color'>

export class CalendarMarkStore {
  private filePath = path.join(app.getPath('userData'), 'calendar-marks.json')
  private queue = Promise.resolve()
  private async read(): Promise<MarkData> { try { const data = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as MarkData; if (!Array.isArray(data.marks)) throw new Error('标注格式无效'); return data } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, marks: [] }; throw new Error('无法读取日历标注。') } }
  private async write(data: MarkData): Promise<void> { this.queue = this.queue.then(async () => { await fs.mkdir(path.dirname(this.filePath), { recursive: true }); const temp = `${this.filePath}.tmp`; await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8'); try { await fs.copyFile(this.filePath, `${this.filePath}.bak`) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn(error) } await fs.rename(temp, this.filePath) }); return this.queue }
  async list(): Promise<CalendarMark[]> { return (await this.read()).marks }
  async create(input: MarkInput): Promise<CalendarMark> { const data = await this.read(), now = new Date().toISOString(); const mark = { ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; data.marks.push(mark); await this.write(data); return mark }
  async update(id: string, input: MarkInput): Promise<CalendarMark> { const data = await this.read(), index = data.marks.findIndex((mark) => mark.id === id); if (index < 0) throw new Error('标注不存在。'); data.marks[index] = { ...data.marks[index], ...input, updatedAt: new Date().toISOString() }; await this.write(data); return data.marks[index] }
  async remove(id: string): Promise<void> { const data = await this.read(); data.marks = data.marks.filter((mark) => mark.id !== id); await this.write(data) }
}
