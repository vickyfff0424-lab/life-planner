import { describe, expect, it } from 'vitest'
import { getSameDayHistory, upsertJournalEntry } from './journalLogic'
import type { JournalEntry } from './types'

describe('多年同日回忆验收流程', () => {
  it('完成新建、编辑、历史日期查看以及三年/五年切换', () => {
    let entries: JournalEntry[] = []
    entries = upsertJournalEntry(entries, '2029-09-19', '今天第一次记录', '2029-09-19T09:00:00')
    expect(entries).toHaveLength(1)

    entries = upsertJournalEntry(entries, '2029-09-19', '今天编辑后的记录', '2029-09-19T10:00:00')
    expect(entries).toHaveLength(1)
    expect(entries[0].content).toBe('今天编辑后的记录')

    entries = upsertJournalEntry(entries, '2028-09-19', '去年同日', '2028-09-19T18:00:00')
    entries = upsertJournalEntry(entries, '2026-09-19', '三年前同日', '2026-09-19T18:00:00')
    const historicalDate = entries.find((item) => item.date === '2028-09-19')
    expect(historicalDate?.content).toBe('去年同日')

    const threeYears = getSameDayHistory('2029-09-19', entries, 3)
    const fiveYears = getSameDayHistory('2029-09-19', entries, 5)
    expect(threeYears).toHaveLength(3)
    expect(fiveYears).toHaveLength(5)
    expect(threeYears[0].entry?.content).toBe('去年同日')
    expect(threeYears[2].entry?.content).toBe('三年前同日')
  })
})
