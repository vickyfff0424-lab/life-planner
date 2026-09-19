import type { Todo } from './types'

export const localDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const isTodayTask = (todo: Todo, today = localDateKey()): boolean =>
  !todo.completed && todo.date === today

export const isUpcomingTask = (todo: Todo, today = localDateKey()): boolean =>
  !todo.completed && todo.date > today

export const toggleTaskStatus = (todo: Todo): Todo => ({
  ...todo,
  completed: !todo.completed,
  updatedAt: new Date().toISOString(),
})

export const sortTasks = (tasks: Todo[]): Todo[] =>
  [...tasks].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))

export const groupByDate = (tasks: Todo[]): Record<string, Todo[]> =>
  sortTasks(tasks).reduce<Record<string, Todo[]>>((groups, todo) => {
    ;(groups[todo.date] ??= []).push(todo)
    return groups
  }, {})
