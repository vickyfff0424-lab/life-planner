import type { CalendarMark } from './types'

const fixedChineseHolidays: Record<string, string> = {
  '01-01': '元旦', '03-08': '妇女节', '05-01': '劳动节', '05-04': '青年节',
  '06-01': '儿童节', '09-10': '教师节', '10-01': '国庆节',
  '02-14': '情人节', '03-12': '植树节', '04-01': '愚人节', '10-31': '万圣节',
  '12-24': '平安夜', '12-25': '圣诞节', '12-31': '跨年夜',
}

export const getChineseHoliday = (date: string): string | undefined => {
  const fixed = fixedChineseHolidays[date.slice(5)]
  if (fixed) return fixed
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(year, month - 1, day, 12).getDay()
  if (month === 5 && weekday === 0 && day >= 8 && day <= 14) return '母亲节'
  if (month === 6 && weekday === 0 && day >= 15 && day <= 21) return '父亲节'
  return undefined
}

export const getMarksForDate = (date: string, marks: CalendarMark[]): CalendarMark[] =>
  marks.filter((mark) => mark.repeat === 'yearly' ? mark.date.slice(5) === date.slice(5) : mark.date === date)
