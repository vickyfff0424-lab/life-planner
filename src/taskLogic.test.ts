import { describe, expect, it } from 'vitest'
import { isTodayTask, isUpcomingTask, toggleTaskStatus } from './taskLogic'
import type { Todo } from './types'

const makeTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: '1', title: '测试任务', description: '', date: '2026-09-19', time: '09:00',
  priority: 'medium', tags: [], reminder: false, completed: false,
  createdAt: '2026-09-18T00:00:00.000Z', updatedAt: '2026-09-18T00:00:00.000Z',
  ...overrides,
})

describe('日期分类', () => {
  it('今天仅包含今天到期且未完成的任务', () => {
    expect(isTodayTask(makeTodo(), '2026-09-19')).toBe(true)
    expect(isTodayTask(makeTodo({ completed: true }), '2026-09-19')).toBe(false)
    expect(isTodayTask(makeTodo({ date: '2026-09-20' }), '2026-09-19')).toBe(false)
  })

  it('即将到来仅包含未来且未完成的任务', () => {
    expect(isUpcomingTask(makeTodo({ date: '2026-09-20' }), '2026-09-19')).toBe(true)
    expect(isUpcomingTask(makeTodo(), '2026-09-19')).toBe(false)
    expect(isUpcomingTask(makeTodo({ date: '2026-09-20', completed: true }), '2026-09-19')).toBe(false)
  })
})

describe('任务状态', () => {
  it('可在完成和未完成之间切换且不修改原对象', () => {
    const todo = makeTodo()
    const completed = toggleTaskStatus(todo)
    expect(completed.completed).toBe(true)
    expect(todo.completed).toBe(false)
    expect(toggleTaskStatus(completed).completed).toBe(false)
  })
})
