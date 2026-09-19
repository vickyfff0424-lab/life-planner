import { describe, expect, it } from 'vitest'
import { getChineseHoliday, getMarksForDate } from './calendarLogic'
import type { CalendarMark } from './types'

const mark = (overrides: Partial<CalendarMark> = {}): CalendarMark => ({ id: '1', date: '2028-09-19', title: '小明生日', repeat: 'yearly', color: 'rose', createdAt: '', updatedAt: '', ...overrides })

describe('日历标注', () => {
  it('显示固定公历中国节日', () => { expect(getChineseHoliday('2029-10-01')).toBe('国庆节'); expect(getChineseHoliday('2029-10-02')).toBeUndefined() })
  it('显示常见生活节日和按星期计算的节日', () => { expect(getChineseHoliday('2029-12-25')).toBe('圣诞节'); expect(getChineseHoliday('2029-05-13')).toBe('母亲节') })
  it('每年重复标注按月日匹配', () => { expect(getMarksForDate('2030-09-19', [mark()])).toHaveLength(1) })
  it('单次标注仅匹配完整日期', () => { expect(getMarksForDate('2029-09-19', [mark({ repeat: 'none' })])).toHaveLength(0) })
})
