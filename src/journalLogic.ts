import type { JournalEntry } from './types'

export interface HistorySlot {
  year: number
  date: string
  entry?: JournalEntry
  validDate: boolean
}

export const isValidLocalDateKey = (key: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return false
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const local = new Date(year, month - 1, day, 12)
  return local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day
}

export const getSameDayHistory = (targetDate: string, entries: JournalEntry[], years: 3 | 5): HistorySlot[] => {
  if (!isValidLocalDateKey(targetDate)) return []
  const [targetYear, month, day] = targetDate.split('-').map(Number)
  return Array.from({ length: years }, (_, index) => {
    const year = targetYear - index - 1
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const validDate = isValidLocalDateKey(date)
    return { year, date, validDate, entry: validDate ? entries.find((entry) => entry.date === date) : undefined }
  })
}

export const upsertJournalEntry = (entries: JournalEntry[], date: string, content: string, now: string): JournalEntry[] => {
  const existing = entries.find((entry) => entry.date === date)
  const saved: JournalEntry = existing
    ? { ...existing, content, updatedAt: now }
    : { date, content, createdAt: now, updatedAt: now }
  return [...entries.filter((entry) => entry.date !== date), saved].sort((a, b) => a.date.localeCompare(b.date))
}

export const getRecentLocalDateKeys = (today: Date = new Date(), count = 7): string[] =>
  Array.from({ length: count }, (_, index) => {
    const value = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index, 12)
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  })
