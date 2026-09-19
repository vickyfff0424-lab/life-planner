export type Priority = 'high' | 'medium' | 'low'

export interface Todo {
  id: string
  title: string
  description: string
  date: string
  time: string
  priority: Priority
  tags: string[]
  reminder: boolean
  completed: boolean
  createdAt: string
  updatedAt: string
  notifiedAt?: string
}

export type TodoInput = Omit<Todo, 'id' | 'completed' | 'createdAt' | 'updatedAt' | 'notifiedAt'>
export interface TodoPatch extends Partial<TodoInput> { completed?: boolean }
export interface TodoApi {
  list: () => Promise<Todo[]>
  create: (input: TodoInput) => Promise<Todo>
  update: (id: string, patch: TodoPatch) => Promise<Todo>
  remove: (id: string) => Promise<void>
}

export interface JournalEntry {
  date: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CalendarMark {
  id: string
  date: string
  title: string
  repeat: 'none' | 'yearly'
  color: 'blue' | 'rose' | 'amber' | 'green'
  createdAt: string
  updatedAt: string
}

export interface CalendarMarkApi {
  list: () => Promise<CalendarMark[]>
  create: (input: Omit<CalendarMark, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CalendarMark>
  update: (id: string, input: Pick<CalendarMark, 'date' | 'title' | 'repeat' | 'color'>) => Promise<CalendarMark>
  remove: (id: string) => Promise<void>
}

export interface JournalApi {
  list: () => Promise<JournalEntry[]>
  save: (date: string, content: string) => Promise<JournalEntry>
  clear: (date: string) => Promise<void>
}

export interface DesktopApi {
  setCompact: (compact: boolean) => Promise<void>
  setAlwaysOnTop: (enabled: boolean) => Promise<void>
  setSize: (width: number, height: number) => Promise<void>
  minimize: () => Promise<void>
  hide: () => Promise<void>
  chooseBackground: () => Promise<string | null>
  getBackground: () => Promise<string | null>
  onExpanded: (callback: () => void) => void
}
