import { describe, expect, it } from 'vitest'
import { getWeekDateKeys, shiftWeek } from './weekLogic'

describe('周计划日期', () => {
  it('生成周一到周日并正确跨月', () => { expect(getWeekDateKeys('2029-09-01')).toEqual(['2029-08-27','2029-08-28','2029-08-29','2029-08-30','2029-08-31','2029-09-01','2029-09-02']) })
  it('切换上一周和下一周使用本地日期', () => { expect(shiftWeek('2029-01-02', -1)).toBe('2028-12-26'); expect(shiftWeek('2029-01-02', 1)).toBe('2029-01-09') })
})
