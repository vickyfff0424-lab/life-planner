import { localDateKey } from './taskLogic'

export const getWeekDateKeys = (anchor: string): string[] => {
  const [year, month, day] = anchor.split('-').map(Number)
  const value = new Date(year, month - 1, day, 12)
  const mondayOffset = (value.getDay() + 6) % 7
  const monday = new Date(year, month - 1, day - mondayOffset, 12)
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index, 12)).map(localDateKey)
}

export const shiftWeek = (anchor: string, amount: number): string => {
  const [year, month, day] = anchor.split('-').map(Number)
  return localDateKey(new Date(year, month - 1, day + amount * 7, 12))
}
