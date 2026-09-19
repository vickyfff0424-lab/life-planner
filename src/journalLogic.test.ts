import { describe, expect, it } from 'vitest'
import { getRecentLocalDateKeys, getSameDayHistory, isValidLocalDateKey, upsertJournalEntry } from './journalLogic'
import type { JournalEntry } from './types'

const entry = (date: string, content = date): JournalEntry => ({ date, content, createdAt: `${date}T08:00:00`, updatedAt: `${date}T09:00:00` })

describe('同日历史', () => {
  const records = [entry('2028-09-19'), entry('2027-09-19'), entry('2024-09-19'), entry('2028-09-18')]
  it('按月和日查找过去三年，最新年份在前', () => {
    const result = getSameDayHistory('2029-09-19', records, 3)
    expect(result.map((slot) => slot.year)).toEqual([2028, 2027, 2026])
    expect(result.map((slot) => slot.entry?.date)).toEqual(['2028-09-19', '2027-09-19', undefined])
  })
  it('按月和日查找过去五年', () => {
    const result = getSameDayHistory('2029-09-19', records, 5)
    expect(result).toHaveLength(5)
    expect(result[4].entry?.date).toBe('2024-09-19')
  })
  it('没有历史记录时保留空年份槽位', () => {
    expect(getSameDayHistory('2029-01-02', [], 3).every((slot) => !slot.entry)).toBe(true)
  })
  it('闰年2月29日不会混入2月28日或3月1日', () => {
    const records = [entry('2024-02-29'), entry('2023-02-28'), entry('2023-03-01')]
    const result = getSameDayHistory('2028-02-29', records, 5)
    expect(result.find((slot) => slot.year === 2024)?.entry?.date).toBe('2024-02-29')
    expect(result.find((slot) => slot.year === 2027)?.validDate).toBe(false)
    expect(result.flatMap((slot) => slot.entry?.date ?? [])).not.toContain('2023-02-28')
  })
  it('用本地日历字段验证日期，不经过UTC日期转换', () => {
    expect(isValidLocalDateKey('2024-02-29')).toBe(true)
    expect(isValidLocalDateKey('2023-02-29')).toBe(false)
    expect(getSameDayHistory('2029-09-19', [entry('2028-09-19')], 3)[0].entry?.date).toBe('2028-09-19')
  })
})

describe('留言保存', () => {
  it('同一天重复保存时更新原记录而不创建重复记录', () => {
    const original = [entry('2029-09-19', '第一次')]
    const updated = upsertJournalEntry(original, '2029-09-19', '第二次', '2029-09-19T10:00:00')
    expect(updated).toHaveLength(1)
    expect(updated[0].content).toBe('第二次')
    expect(updated[0].createdAt).toBe(original[0].createdAt)
    expect(updated[0].updatedAt).toBe('2029-09-19T10:00:00')
  })
})

describe('最近七天', () => {
  it('按本地日历生成今天及前六天，并正确跨月', () => {
    const dates = getRecentLocalDateKeys(new Date(2029, 2, 2, 23, 30), 7)
    expect(dates).toEqual(['2029-03-02', '2029-03-01', '2029-02-28', '2029-02-27', '2029-02-26', '2029-02-25', '2029-02-24'])
  })
})
