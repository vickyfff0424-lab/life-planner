import { useEffect, useMemo, useRef, useState } from 'react'
import { groupByDate, isTodayTask, isUpcomingTask, localDateKey, sortTasks } from './taskLogic'
import { getRecentLocalDateKeys, getSameDayHistory } from './journalLogic'
import { getChineseHoliday, getMarksForDate } from './calendarLogic'
import { getWeekDateKeys, shiftWeek } from './weekLogic'
import type { CalendarMark, JournalEntry, Priority, Todo, TodoInput } from './types'

type View = 'week' | 'today' | 'upcoming' | 'calendar' | 'journal' | 'completed'
const priorityText: Record<Priority, string> = { high: '高', medium: '中', low: '低' }
const viewInfo: Record<View, { icon: string; label: string; subtitle: string }> = {
  week: { icon: '▥', label: '本周计划', subtitle: '把一周七天放在眼前，从容安排生活' },
  today: { icon: '☀', label: '今天', subtitle: '专注于今天要完成的事情' },
  upcoming: { icon: '↗', label: '即将到来', subtitle: '提前安排接下来的任务' },
  calendar: { icon: '▦', label: '日历', subtitle: '按日期查看和规划任务' },
  journal: { icon: '✦', label: '今日回忆', subtitle: '写下今天，也遇见往年的自己' },
  completed: { icon: '✓', label: '已完成', subtitle: '回顾已经完成的任务' },
}

function WeeklyBoard({ dates, tasks, marks, onAdd, onToggle, onEdit, onDelete }: { dates: string[]; tasks: Todo[]; marks: CalendarMark[]; onAdd: (date: string) => void; onToggle: (todo: Todo) => void; onEdit: (todo: Todo) => void; onDelete: (todo: Todo) => void }) {
  const weekdays = ['周一','周二','周三','周四','周五','周六','周日']
  return <div className="weekly-board">{dates.map((date, index) => { const dayTasks = sortTasks(tasks.filter((todo) => todo.date === date && !todo.completed)), holiday = getChineseHoliday(date), dayMarks = getMarksForDate(date, marks); return <section className={`week-day ${date === localDateKey() ? 'today' : ''}`} key={date}><header><div><span>{weekdays[index]}</span><b>{Number(date.slice(8))}</b></div><button onClick={() => onAdd(date)}>＋</button></header>{holiday && <small className="week-holiday">{holiday}</small>}{dayMarks.map((mark) => <small className={`week-mark ${mark.color}`} key={mark.id}>{mark.title}</small>)}<div className="week-tasks">{dayTasks.length ? dayTasks.map((todo) => <article className={`week-task ${todo.priority}`} key={todo.id}><button className="mini-check" onClick={() => onToggle(todo)}></button><div onClick={() => onEdit(todo)}><strong>{todo.title}</strong><small>{todo.time}</small></div><button className="mini-delete" onClick={() => onDelete(todo)}>×</button></article>) : <button className="week-empty" onClick={() => onAdd(date)}>添加安排</button>}</div></section> })}</div>
}

function JournalView({ date, entries, onChanged, onSelectDate }: { date: string; entries: JournalEntry[]; onChanged: () => Promise<void>; onSelectDate: (date: string) => void }) {
  const savedEntry = entries.find((entry) => entry.date === date)
  const draftKey = `journal-draft-${date}`
  const [content, setContent] = useState(localStorage.getItem(draftKey) ?? savedEntry?.content ?? '')
  const [mode, setMode] = useState<3 | 5>(() => localStorage.getItem('journal-history-years') === '3' ? 3 : 5)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { setContent(localStorage.getItem(`journal-draft-${date}`) ?? savedEntry?.content ?? ''); setStatus('') }, [date, savedEntry?.updatedAt])
  const changeMode = (value: 3 | 5) => { setMode(value); localStorage.setItem('journal-history-years', String(value)) }
  const save = async () => {
    setSaving(true); setStatus('')
    try { await window.journalApi.save(date, content); localStorage.removeItem(draftKey); await onChanged(); setStatus('已保存') }
    catch (error) { setStatus(error instanceof Error ? error.message : '保存失败') }
    finally { setSaving(false) }
  }
  const clear = async () => {
    if (!savedEntry && !content) return
    if (!confirm(`确定要清空 ${dateLabel(date)} 的留言吗？此操作无法撤销。`)) return
    await window.journalApi.clear(date); localStorage.removeItem(draftKey); setContent(''); await onChanged(); setStatus('已清空')
  }
  const history = getSameDayHistory(date, entries, mode)
  const recentDates = getRecentLocalDateKeys()
  const fullDate = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00`))
  const savedTime = savedEntry ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(savedEntry.updatedAt)) : ''
  return <section className="journal-page">
    <div className="recent-journal"><div><strong>最近七天</strong><small>忙碌时漏记了，也可以回来补上。</small></div><div className="recent-days">{recentDates.map((key, index) => { const hasEntry = entries.some((entry) => entry.date === key && entry.content.trim()); return <button className={date === key ? 'active' : ''} key={key} onClick={() => onSelectDate(key)}><span>{index === 0 ? '今天' : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(`${key}T12:00:00`))}</span><b>{Number(key.slice(8))}</b><i className={hasEntry ? 'recorded' : ''}></i></button> })}</div></div>
    <div className="journal-editor">
      <div className="journal-date"><span>{date === localDateKey() ? '今天' : '这一天'}</span><h2>{fullDate}</h2></div>
      <textarea value={content} onChange={(event) => { const value = event.target.value; setContent(value); localStorage.setItem(draftKey, value); setStatus('草稿已保存在本机') }} placeholder="此刻的天气、心情，今天发生的小事……都可以写在这里。" />
      <div className="journal-footer"><div><span>{content.length} 字</span>{savedTime && <span>最后保存：{savedTime}</span>}{status && <strong>{status}</strong>}</div><div><button className="secondary" onClick={() => void clear()}>清空</button><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : savedEntry ? '保存修改' : '保存留言'}</button></div></div>
    </div>
    <div className="memory-head"><div><h2>同日往年</h2><p>看看过去的今天，时间曾留下什么。</p></div><div className="year-toggle"><button className={mode === 3 ? 'active' : ''} onClick={() => changeMode(3)}>三年</button><button className={mode === 5 ? 'active' : ''} onClick={() => changeMode(5)}>五年</button></div></div>
    <div className="memory-list">{history.map((slot) => <article className="memory-card" key={slot.date}><div className="memory-year">{slot.year}<small>年</small></div><div><h3>{slot.validDate ? dateLabel(slot.date) : `${slot.year}年没有2月29日`}</h3>{slot.entry ? <><p>{slot.entry.content}</p><small>保存于 {new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(slot.entry.updatedAt))}</small></> : <p className="no-memory">这一年没有留下记录</p>}</div></article>)}</div>
  </section>
}

const dateLabel = (key: string) => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${key}T12:00:00`))

function TaskCard({ todo, onToggle, onEdit, onDelete }: { todo: Todo; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  return <article className={`task-card priority-${todo.priority} ${todo.completed ? 'is-completed' : ''}`}>
    <button className="check" onClick={onToggle} aria-label={todo.completed ? '恢复为未完成' : '标记为已完成'}>{todo.completed ? '✓' : ''}</button>
    <div className="task-content">
      <div className="task-title-row"><h3>{todo.title}</h3><span className={`priority-pill ${todo.priority}`}>{priorityText[todo.priority]}优先级</span></div>
      {todo.description && <p>{todo.description}</p>}
      <div className="meta"><span>◷ {todo.time}</span>{todo.reminder && <span>♢ 已提醒</span>}{todo.tags.map((tag) => <span className="tag" key={tag}>#{tag}</span>)}</div>
    </div>
    <div className="card-actions"><button onClick={onEdit} title="编辑">✎</button><button onClick={onDelete} title="删除">⌫</button></div>
  </article>
}

function TaskForm({ initial, defaultDate, onClose, onSave }: { initial?: Todo; defaultDate: string; onClose: () => void; onSave: (input: TodoInput) => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [time, setTime] = useState(initial?.time ?? '09:00')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [tags, setTags] = useState(initial?.tags.join('，') ?? '')
  const [reminder, setReminder] = useState(initial?.reminder ?? false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) { setError('请输入任务标题。'); return }
    if (!date || !time) { setError('请选择日期和时间。'); return }
    setSaving(true); setError('')
    try {
      await onSave({ title: title.trim(), description: description.trim(), date, time, priority, reminder, tags: tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean) })
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败，请重试。'); setSaving(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="task-form" onSubmit={submit}>
      <header><div><h2>{initial ? '编辑待办' : '添加待办'}</h2><p>安排好时间，让每件事都有着落。</p></div><button type="button" className="close" onClick={onClose}>×</button></header>
      <label>标题 <b>*</b><input autoFocus maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：准备周会材料" /></label>
      <label>描述<textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="补充一些细节（可选）" /></label>
      <div className="form-grid"><label>日期 <b>*</b><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>时间 <b>*</b><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label></div>
      <fieldset><legend>优先级</legend><div className="priority-options">{(['high','medium','low'] as Priority[]).map((value) => <label className={priority === value ? 'selected' : ''} key={value}><input type="radio" value={value} checked={priority === value} onChange={() => setPriority(value)} /><i className={value}></i>{priorityText[value]}</label>)}</div></fieldset>
      <label>标签<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="工作，会议（用逗号分隔）" /></label>
      <label className="switch-row"><span><strong>开启提醒</strong><small>到达设定时间时发送系统通知</small></span><input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} /></label>
      {error && <div className="form-error">{error}</div>}
      <footer><button type="button" className="secondary" onClick={onClose}>取消</button><button type="submit" className="primary" disabled={saving}>{saving ? '保存中…' : '保存任务'}</button></footer>
    </form>
  </div>
}

function Calendar({ tasks, marks, selected, onSelect }: { tasks: Todo[]; marks: CalendarMark[]; selected: string; onSelect: (date: string) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(`${selected}T12:00:00`); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const year = cursor.getFullYear(), month = cursor.getMonth()
  const cells: (Date | null)[] = Array(cursor.getDay()).fill(null)
  const days = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= days; i++) cells.push(new Date(year, month, i))
  const taskCounts = tasks.reduce<Record<string, number>>((acc, todo) => { acc[todo.date] = (acc[todo.date] ?? 0) + 1; return acc }, {})
  return <div className="calendar-card">
    <div className="calendar-head"><button onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button><h2>{year}年 {month + 1}月</h2><button onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button></div>
    <div className="calendar-grid weekdays">{['日','一','二','三','四','五','六'].map((d) => <span key={d}>{d}</span>)}</div>
    <div className="calendar-grid days">{cells.map((date, index) => date ? (() => { const key = localDateKey(date), holiday = getChineseHoliday(key), dateMarks = getMarksForDate(key, marks); return <button key={key} className={`${key === selected ? 'selected' : ''} ${key === localDateKey() ? 'today' : ''}`} onClick={() => onSelect(key)}><span>{date.getDate()}</span>{(holiday || dateMarks[0]) && <small className={dateMarks[0] ? `mark-${dateMarks[0].color}` : 'holiday'}>{dateMarks[0]?.title ?? holiday}</small>}{taskCounts[key] ? <em>{taskCounts[key]}</em> : null}</button> })() : <span key={`blank-${index}`} />)}</div>
  </div>
}

function MarkForm({ date, initial, onClose, onSaved }: { date: string; initial?: CalendarMark; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [repeat, setRepeat] = useState<'none' | 'yearly'>(initial?.repeat ?? 'yearly')
  const [color, setColor] = useState<CalendarMark['color']>(initial?.color ?? 'rose')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) { setError('请输入标注名称。'); return } const input = { date, title: title.trim(), repeat, color }; if (initial) await window.calendarMarkApi.update(initial.id, input); else await window.calendarMarkApi.create(input); await onSaved(); onClose() }
  return <div className="modal-backdrop"><form className="mark-form" onSubmit={(event) => void submit(event)}><header><div><h2>{initial ? '编辑日历标注' : '添加日历标注'}</h2><p>{dateLabel(date)}</p></div><button type="button" className="close" onClick={onClose}>×</button></header><label>名称<input autoFocus maxLength={40} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：小明生日" /></label><label>重复<select value={repeat} onChange={(event) => setRepeat(event.target.value as 'none' | 'yearly')}><option value="yearly">每年重复（适合生日、纪念日）</option><option value="none">仅此日期</option></select></label><fieldset><legend>颜色</legend><div className="mark-colors">{(['blue','rose','amber','green'] as const).map((value) => <button type="button" aria-label={value} className={`${value} ${color === value ? 'active' : ''}`} key={value} onClick={() => setColor(value)} />)}</div></fieldset>{error && <div className="form-error">{error}</div>}<footer><button type="button" className="secondary" onClick={onClose}>取消</button><button className="primary">保存标注</button></footer></form></div>
}

export default function App() {
  const [tasks, setTasks] = useState<Todo[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [calendarMarks, setCalendarMarks] = useState<CalendarMark[]>([])
  const [view, setView] = useState<View>('week')
  const [weekAnchor, setWeekAnchor] = useState(localDateKey())
  const [selectedDate, setSelectedDate] = useState(localDateKey())
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [tagFilter, setTagFilter] = useState('all')
  const [form, setForm] = useState<{ todo?: Todo; date: string } | null>(null)
  const [markForm, setMarkForm] = useState<CalendarMark | 'new' | null>(null)
  const [loadError, setLoadError] = useState('')
  const [compact, setCompact] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [backgroundOpacity, setBackgroundOpacity] = useState(() => Number(localStorage.getItem('widget-background-opacity') ?? '0.22'))
  const [autoHide, setAutoHide] = useState(() => localStorage.getItem('widget-auto-hide') !== 'false')
  const [alwaysOnTop, setAlwaysOnTop] = useState(() => localStorage.getItem('widget-always-on-top') !== 'false')
  const hideTimer = useRef<number | null>(null)
  const reload = async () => { try { const [nextTasks, nextEntries, nextMarks] = await Promise.all([window.todoApi.list(), window.journalApi.list(), window.calendarMarkApi.list()]); setTasks(nextTasks); setJournalEntries(nextEntries); setCalendarMarks(nextMarks); setLoadError('') } catch (e) { setLoadError(e instanceof Error ? e.message : '读取本地数据失败。') } }
  useEffect(() => { void reload() }, [])
  useEffect(() => { void window.desktopApi.getBackground().then(setBackgroundUrl); void window.desktopApi.setAlwaysOnTop(alwaysOnTop); window.desktopApi.onExpanded(() => setCompact(false)) }, [])
  const expandWidget = async () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); if (compact) { await window.desktopApi.setCompact(false); setCompact(false) } }
  const scheduleCompact = () => {
    if (!autoHide || settingsOpen || form || markForm || compact) return
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(async () => { setCompact(true); await window.desktopApi.setCompact(true) }, 2500)
  }
  useEffect(() => {
    const cancel = () => { if (hideTimer.current) window.clearTimeout(hideTimer.current) }
    const onBlur = () => scheduleCompact()
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', cancel)
    window.addEventListener('keydown', cancel)
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', cancel); window.removeEventListener('keydown', cancel); cancel() }
  }, [autoHide, settingsOpen, form, markForm, compact])
  const chooseBackground = async () => { const selected = await window.desktopApi.chooseBackground(); if (selected) setBackgroundUrl(selected) }
  const updateOpacity = (value: number) => { setBackgroundOpacity(value); localStorage.setItem('widget-background-opacity', String(value)) }
  const updateAutoHide = (value: boolean) => { setAutoHide(value); localStorage.setItem('widget-auto-hide', String(value)) }
  const updateAlwaysOnTop = (value: boolean) => { setAlwaysOnTop(value); localStorage.setItem('widget-always-on-top', String(value)); void window.desktopApi.setAlwaysOnTop(value) }
  const setWidgetSize = (width: number, height: number) => { void window.desktopApi.setSize(width, height) }
  const tags = useMemo(() => [...new Set(tasks.flatMap((todo) => todo.tags))].sort(), [tasks])
  const visible = useMemo(() => {
    let result = view === 'today' ? tasks.filter((t) => isTodayTask(t)) : view === 'upcoming' ? tasks.filter((t) => isUpcomingTask(t)) : view === 'completed' ? tasks.filter((t) => t.completed) : view === 'calendar' ? tasks.filter((t) => t.date === selectedDate) : view === 'week' ? tasks.filter((t) => getWeekDateKeys(weekAnchor).includes(t.date)) : []
    if (priorityFilter !== 'all') result = result.filter((t) => t.priority === priorityFilter)
    if (tagFilter !== 'all') result = result.filter((t) => t.tags.includes(tagFilter))
    return sortTasks(result)
  }, [tasks, view, selectedDate, weekAnchor, priorityFilter, tagFilter])
  const save = async (input: TodoInput) => { if (form?.todo) await window.todoApi.update(form.todo.id, input); else await window.todoApi.create(input); await reload() }
  const toggle = async (todo: Todo) => { await window.todoApi.update(todo.id, { completed: !todo.completed }); await reload() }
  const remove = async (todo: Todo) => { if (confirm(`确定要删除“${todo.title}”吗？此操作无法撤销。`)) { await window.todoApi.remove(todo.id); await reload() } }
  const removeMark = async (mark: CalendarMark) => { if (confirm(`确定删除日历标注“${mark.title}”吗？`)) { await window.calendarMarkApi.remove(mark.id); await reload() } }
  const groups = groupByDate(visible)
  const weekDates = getWeekDateKeys(weekAnchor)
  const selectedMarks = getMarksForDate(selectedDate, calendarMarks)
  const selectedHoliday = getChineseHoliday(selectedDate)
  if (compact) return <div className="compact-mode" onMouseEnter={() => void expandWidget()}><button title="展开我的日程">✓<span>我的日程</span></button></div>
  return <div className={`widget-window ${backgroundUrl ? 'has-background' : ''}`} style={{ '--widget-bg': backgroundUrl ? `url("${backgroundUrl}")` : 'none', '--widget-opacity': backgroundOpacity } as React.CSSProperties} onMouseEnter={() => void expandWidget()}>
    <div className="window-drag"><span>我的日程 · 桌面小组件</span><div className="window-controls"><button onClick={() => setSettingsOpen(true)} title="小组件设置">⚙</button><button onClick={() => void window.desktopApi.minimize()} title="最小化">—</button><button onClick={() => void window.desktopApi.hide()} title="隐藏到托盘">×</button></div></div>
    <div className="app-shell">
    <aside><div className="brand"><span>✓</span><div><strong>我的日程</strong><small>把生活安排得刚刚好</small></div></div><nav>{(Object.keys(viewInfo) as View[]).map((key) => <button className={view === key ? 'active' : ''} key={key} onClick={() => { setView(key); if (key === 'journal') setSelectedDate(localDateKey()) }}><i>{viewInfo[key].icon}</i>{viewInfo[key].label}{key === 'today' && <em>{tasks.filter((t) => isTodayTask(t)).length}</em>}</button>)}</nav><div className="privacy">⌂ 数据仅保存在本机</div></aside>
    <main><header className="topbar"><div><h1>{view === 'journal' && selectedDate !== localDateKey() ? '日期回忆' : viewInfo[view].label}</h1><p>{viewInfo[view].subtitle}</p></div>{view !== 'journal' && <button className="primary add" onClick={() => setForm({ date: view === 'calendar' ? selectedDate : localDateKey() })}>＋ 添加待办</button>}</header>
      {view !== 'journal' && <div className="filters"><label>优先级<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}><option value="all">全部</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label><label>标签<select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}><option value="all">全部</option>{tags.map((tag) => <option key={tag}>{tag}</option>)}</select></label></div>}
      {view === 'week' && <div className="week-controls"><button onClick={() => setWeekAnchor(shiftWeek(weekAnchor, -1))}>‹ 上一周</button><strong>{dateLabel(weekDates[0])} — {dateLabel(weekDates[6])}</strong><button onClick={() => setWeekAnchor(localDateKey())}>本周</button><button onClick={() => setWeekAnchor(shiftWeek(weekAnchor, 1))}>下一周 ›</button></div>}
      {loadError && <div className="error-banner">{loadError}<button onClick={() => void reload()}>重试</button></div>}
      {view === 'calendar' && <><Calendar tasks={tasks} marks={calendarMarks} selected={selectedDate} onSelect={setSelectedDate} /><div className="calendar-mark-panel"><div><strong>{dateLabel(selectedDate)}</strong>{selectedHoliday && <span className="built-in-holiday">节日 · {selectedHoliday}</span>}{selectedMarks.map((mark) => <span className={`custom-mark ${mark.color}`} key={mark.id}>{mark.title}{mark.repeat === 'yearly' ? ' · 每年' : ''}<button onClick={() => setMarkForm(mark)}>✎</button><button onClick={() => void removeMark(mark)}>×</button></span>)}</div><button className="secondary" onClick={() => setMarkForm('new')}>＋ 添加标注</button></div><div className="calendar-links"><button onClick={() => { setView('journal') }}>✦ 查看或编辑这一天的留言</button></div></>}
      {view === 'week' && <WeeklyBoard dates={weekDates} tasks={visible} marks={calendarMarks} onAdd={(date) => setForm({ date })} onToggle={(todo) => void toggle(todo)} onEdit={(todo) => setForm({ todo, date: todo.date })} onDelete={(todo) => void remove(todo)} />}
      {view === 'journal' ? <JournalView date={selectedDate} entries={journalEntries} onChanged={reload} onSelectDate={setSelectedDate} /> : view === 'week' ? null : <section className="task-section">{view === 'calendar' && <h2 className="selected-heading">{dateLabel(selectedDate)}的任务</h2>}{visible.length === 0 ? <div className="empty"><div>✓</div><h2>{view === 'completed' ? '还没有已完成的任务' : '这里暂时没有任务'}</h2><p>给自己留一点空间，或者添加一项新的待办。</p><button className="primary" onClick={() => setForm({ date: view === 'calendar' ? selectedDate : localDateKey() })}>添加第一项任务</button></div> : view === 'upcoming' ? Object.entries(groups).map(([date, items]) => <div className="date-group" key={date}><h2>{dateLabel(date)} <small>{items.length} 项</small></h2>{items.map((todo) => <TaskCard key={todo.id} todo={todo} onToggle={() => void toggle(todo)} onEdit={() => setForm({ todo, date: todo.date })} onDelete={() => void remove(todo)} />)}</div>) : visible.map((todo) => <TaskCard key={todo.id} todo={todo} onToggle={() => void toggle(todo)} onEdit={() => setForm({ todo, date: todo.date })} onDelete={() => void remove(todo)} />)}</section>}
    </main>{form && <TaskForm initial={form.todo} defaultDate={form.date} onClose={() => setForm(null)} onSave={save} />}{markForm && <MarkForm date={selectedDate} initial={markForm === 'new' ? undefined : markForm} onClose={() => setMarkForm(null)} onSaved={reload} />}
    </div>
    {settingsOpen && <div className="settings-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}><section className="widget-settings"><header><div><h2>桌面小组件设置</h2><p>调整浮窗行为、大小和背景外观</p></div><button onClick={() => setSettingsOpen(false)}>×</button></header><div className="setting-row"><div><strong>自动收缩</strong><small>切换到其他窗口后再收缩，输入时不会消失</small></div><input type="checkbox" checked={autoHide} onChange={(event) => updateAutoHide(event.target.checked)} /></div><div className="setting-row"><div><strong>保持置顶</strong><small>让小组件显示在其他窗口上方</small></div><input type="checkbox" checked={alwaysOnTop} onChange={(event) => updateAlwaysOnTop(event.target.checked)} /></div><div className="size-setting"><strong>浮窗大小</strong><div><button onClick={() => setWidgetSize(520, 600)}>小</button><button onClick={() => setWidgetSize(760, 640)}>标准</button><button onClick={() => setWidgetSize(1020, 720)}>大</button></div><small>也可以直接拖动窗口边缘自由调整。</small></div><div className="background-setting"><strong>自定义背景</strong><button className="secondary" onClick={() => void chooseBackground()}>选择本机图片</button><label>图片透明度 <span>{Math.round(backgroundOpacity * 100)}%</span><input type="range" min="0" max="0.75" step="0.05" value={backgroundOpacity} onChange={(event) => updateOpacity(Number(event.target.value))} /></label><small>图片只会复制到本机应用数据目录，不会上传。</small></div><footer><button className="primary" onClick={() => setSettingsOpen(false)}>完成</button></footer></section></div>}
  </div>
}
