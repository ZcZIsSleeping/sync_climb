type TouchEventLike = {
  currentTarget: { dataset: Record<string, string | boolean | number | undefined> }
  touches: Array<{ clientX: number; clientY: number }>
}

type InputEventLike = {
  detail: { value: string }
}

type CalendarDay = {
  date: string
  day: number
  isBlank: boolean
  isToday: boolean
  isSelecting: boolean
  eventCount: number
  moreCount: number
}

type CalendarWeek = {
  days: CalendarDay[]
  segments: EventSegment[]
  moreMarkers: MoreMarker[]
}

type CalendarMonth = {
  key: string
  title: string
  weeks: CalendarWeek[]
}

type ClimbEvent = {
  id: string
  title: string
  creator: string
  start: string
  end: string
  createdAt: number
  color: 'blue' | 'pink'
}

type EventSegment = {
  id: string
  title: string
  creator: string
  color: string
  style: string
  label: string
}

type MoreMarker = {
  date: string
  count: number
  style: string
}

type EventPreview = ClimbEvent & {
  range: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const seedEvents: ClimbEvent[] = [
  {
    id: 'EVT-2025-0416',
    title: '川西岩壁训练',
    creator: '我',
    start: '2025-04-03',
    end: '2025-04-16',
    createdAt: 1712700000000,
    color: 'blue',
  },
  {
    id: 'EVT-2025-0409',
    title: '装备轻量化复盘',
    creator: '阿岚',
    start: '2025-04-06',
    end: '2025-04-09',
    createdAt: 1712820000000,
    color: 'pink',
  },
  {
    id: 'EVT-2025-0415',
    title: '绳索系统演练',
    creator: '周野',
    start: '2025-04-07',
    end: '2025-04-15',
    createdAt: 1712920000000,
    color: 'blue',
  },
  {
    id: 'EVT-2025-0508',
    title: '四姑娘山二峰攀登计划',
    creator: '我',
    start: '2025-05-06',
    end: '2025-05-10',
    createdAt: 1713000000000,
    color: 'blue',
  },
  {
    id: 'EVT-2025-0518',
    title: '雪山适应性训练',
    creator: '林晨',
    start: '2025-05-15',
    end: '2025-05-18',
    createdAt: 1713100000000,
    color: 'pink',
  },
  {
    id: 'EVT-2025-0529',
    title: '广州出发 - 拉萨',
    creator: '我',
    start: '2025-05-26',
    end: '2025-05-29',
    createdAt: 1713200000000,
    color: 'blue',
  },
]

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function durationDays(event: ClimbEvent): number {
  return Math.round((dateFromKey(event.end).getTime() - dateFromKey(event.start).getTime()) / DAY_MS) + 1
}

function sortedEventsForDate(events: ClimbEvent[], date: string): ClimbEvent[] {
  return events
    .filter((event) => event.start <= date && event.end >= date)
    .sort((a, b) => {
      const byDuration = durationDays(b) - durationDays(a)
      if (byDuration !== 0) return byDuration
      return b.createdAt - a.createdAt
    })
}

function inRange(date: string, start: string, end: string): boolean {
  const from = start < end ? start : end
  const to = start < end ? end : start
  return date >= from && date <= to
}

function rangeText(start: string, end: string): string {
  const startDate = dateFromKey(start)
  const endDate = dateFromKey(end)
  const a = `${`${startDate.getMonth() + 1}`.padStart(2, '0')}.${`${startDate.getDate()}`.padStart(2, '0')}`
  const b = `${`${endDate.getMonth() + 1}`.padStart(2, '0')}.${`${endDate.getDate()}`.padStart(2, '0')}`
  return start === end ? a : `${a} - ${b}`
}

function buildMonths(
  events: ClimbEvent[],
  monthCount: number,
  selectingStart: string,
  selectingEnd: string,
): CalendarMonth[] {
  const anchor = new Date(2025, 3, 1)
  const months: CalendarMonth[] = []
  for (let i = 0; i < monthCount; i += 1) {
    months.push(buildMonth(addMonths(anchor, i), events, selectingStart, selectingEnd))
  }
  return months
}

function buildMonth(monthDate: Date, events: ClimbEvent[], selectingStart: string, selectingEnd: string): CalendarMonth {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  const gridStart = addDays(monthStart, -mondayIndex(monthStart))
  const weeks: CalendarWeek[] = []
  const monthStartKey = dateKey(monthStart)
  const monthEndKey = dateKey(monthEnd)

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStartDate = addDays(gridStart, weekIndex * 7)
    const days: CalendarDay[] = []

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const current = addDays(weekStartDate, dayIndex)
      const key = dateKey(current)
      const inMonth = current.getMonth() === monthDate.getMonth()
      const count = inMonth ? sortedEventsForDate(events, key).length : 0
      days.push({
        date: key,
        day: current.getDate(),
        isBlank: !inMonth,
        isToday: key === dateKey(new Date()),
        isSelecting: inMonth && selectingStart !== '' && selectingEnd !== '' && inRange(key, selectingStart, selectingEnd),
        eventCount: count,
        moreCount: Math.max(0, count - 2),
      })
    }

    weeks.push({
      days,
      segments: buildWeekSegments(weekStartDate, monthStartKey, monthEndKey, events),
      moreMarkers: buildWeekMoreMarkers(weekStartDate, monthStartKey, monthEndKey, events),
    })
  }

  return {
    key: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
    title: `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
    weeks,
  }
}

function buildWeekSegments(weekStartDate: Date, monthStart: string, monthEnd: string, events: ClimbEvent[]): EventSegment[] {
  const weekStart = dateKey(weekStartDate)
  const weekEnd = dateKey(addDays(weekStartDate, 6))
  const visibleStart = weekStart < monthStart ? monthStart : weekStart
  const visibleEnd = weekEnd > monthEnd ? monthEnd : weekEnd
  const selectedIds = new Set<string>()

  for (let i = 0; i < 7; i += 1) {
    const day = dateKey(addDays(weekStartDate, i))
    if (day < visibleStart || day > visibleEnd) continue
    sortedEventsForDate(events, day)
      .slice(0, 2)
      .forEach((event) => selectedIds.add(event.id))
  }

  return events
    .filter((event) => selectedIds.has(event.id) && event.start <= visibleEnd && event.end >= visibleStart)
    .sort((a, b) => {
      const byDuration = durationDays(b) - durationDays(a)
      if (byDuration !== 0) return byDuration
      return b.createdAt - a.createdAt
    })
    .map((event) => {
      const start = event.start < visibleStart ? visibleStart : event.start
      const end = event.end > visibleEnd ? visibleEnd : event.end
      const startOffset = Math.round((dateFromKey(start).getTime() - weekStartDate.getTime()) / DAY_MS)
      const endOffset = Math.round((dateFromKey(end).getTime() - weekStartDate.getTime()) / DAY_MS)
      const dayRank = sortedEventsForDate(events, start).findIndex((item) => item.id === event.id)
      const row = dayRank <= 0 ? 0 : 1
      const top = 62 + row * 30
      const first = event.start >= visibleStart
      const last = event.end <= visibleEnd
      const radius = `${first ? '999rpx' : '6rpx'} ${last ? '999rpx' : '6rpx'} ${last ? '999rpx' : '6rpx'} ${first ? '999rpx' : '6rpx'}`

      return {
        id: event.id,
        title: event.title,
        creator: event.creator,
        color: event.color === 'pink' ? 'event-segment--pink' : 'event-segment--blue',
        label: `${event.title}(${event.creator})`,
        style: `left:${startOffset * (100 / 7) + 0.6}%;width:${(endOffset - startOffset + 1) * (100 / 7) - 1.2}%;top:${top}rpx;border-radius:${radius};`,
      }
    })
}

function buildWeekMoreMarkers(weekStartDate: Date, monthStart: string, monthEnd: string, events: ClimbEvent[]): MoreMarker[] {
  const markers: MoreMarker[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = dateKey(addDays(weekStartDate, i))
    if (day < monthStart || day > monthEnd) continue
    const count = sortedEventsForDate(events, day).length
    if (count <= 2) continue
    markers.push({
      date: day,
      count: count - 2,
      style: `left:${i * (100 / 7) + 0.6}%;width:${100 / 7 - 1.2}%;top:122rpx;`,
    })
  }
  return markers
}

Page({
  data: {
    months: [] as CalendarMonth[],
    weekdays: WEEKDAYS,
    events: seedEvents as ClimbEvent[],
    monthCount: 4,
    scrollEnabled: true,
    selectingStart: '',
    selectingEnd: '',
    createVisible: false,
    createRangeText: '',
    createTitle: '',
    expandedDate: '',
    expandedTitle: '',
    expandedEvents: [] as EventPreview[],
    expandedPanelStyle: '',
    editingEvent: null as EventPreview | null,
    editTitle: '',
  },

  longPressActive: false,
  touchStartDate: '',
  touchLastDate: '',

  onLoad() {
    this.refreshMonths()
  },

  refreshMonths() {
    const data = this.data as {
      events: ClimbEvent[]
      monthCount: number
      selectingStart: string
      selectingEnd: string
    }
    this.setData({
      months: buildMonths(data.events, data.monthCount, data.selectingStart, data.selectingEnd),
    })
  },

  onScrollToLower() {
    const data = this.data as { monthCount: number }
    this.setData({ monthCount: data.monthCount + 3 }, () => this.refreshMonths())
  },

  onDayTouchStart(event: TouchEventLike) {
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    this.touchStartDate = date
    this.touchLastDate = date
  },

  onDayLongPress(event: TouchEventLike) {
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    wx.vibrateShort({ type: 'light' })
    this.longPressActive = true
    this.touchStartDate = date
    this.touchLastDate = date
    this.setData({
      scrollEnabled: false,
      selectingStart: date,
      selectingEnd: date,
      expandedDate: '',
    }, () => this.refreshMonths())
  },

  onDayTouchMove(event: TouchEventLike) {
    if (!this.longPressActive) return
    const touch = event.touches[0]
    this.updateSelectionFromPoint(touch.clientX, touch.clientY)
  },

  onDayTouchEnd() {
    if (!this.longPressActive) return
    const start = this.touchStartDate < this.touchLastDate ? this.touchStartDate : this.touchLastDate
    const end = this.touchStartDate < this.touchLastDate ? this.touchLastDate : this.touchStartDate
    this.longPressActive = false
    this.setData({
      scrollEnabled: true,
      selectingStart: start,
      selectingEnd: end,
      createVisible: true,
      createRangeText: rangeText(start, end),
      createTitle: '',
    }, () => this.refreshMonths())
  },

  onDayTap(event: TouchEventLike) {
    if (event.currentTarget.dataset.blank || this.longPressActive) return
    const date = String(event.currentTarget.dataset.date || '')
    const dayEvents = sortedEventsForDate((this.data as { events: ClimbEvent[] }).events, date)
    if (dayEvents.length === 0) return
    this.setData({
      expandedDate: date,
      expandedTitle: this.formatDateTitle(date),
      expandedEvents: dayEvents.map((item) => ({ ...item, range: rangeText(item.start, item.end) })),
      createVisible: false,
    })
    this.positionExpandedPanel(date)
  },

  updateSelectionFromPoint(x: number, y: number) {
    wx.createSelectorQuery()
      .selectAll('.day-cell')
      .boundingClientRect((rects) => {
        const match = rects.find((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
        if (!match || !match.id) return
        const date = match.id.replace(/^d/, '')
        if (date === this.touchLastDate) return
        this.touchLastDate = date
        this.setData({ selectingEnd: date }, () => this.refreshMonths())
      })
      .exec()
  },

  positionExpandedPanel(date: string) {
    wx.createSelectorQuery()
      .select(`#d${date}`)
      .boundingClientRect((rect) => {
        if (!rect) return
        const system = wx.getSystemInfoSync()
        const panelHeight = 420
        const top = Math.max(82, Math.min(rect.top + rect.height + 8, system.windowHeight - panelHeight))
        const originX = Math.max(12, Math.min(88, ((rect.left + rect.width / 2) / system.windowWidth) * 100))
        this.setData({ expandedPanelStyle: `top:${top}px;transform-origin:${originX}% 0%;` })
      })
      .exec()
  },

  onCreateInput(event: InputEventLike) {
    this.setData({ createTitle: event.detail.value })
  },

  saveCreatedEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      selectingStart: string
      selectingEnd: string
      createTitle: string
    }
    const title = data.createTitle.trim()
    if (!title) return
    const start = data.selectingStart < data.selectingEnd ? data.selectingStart : data.selectingEnd
    const end = data.selectingStart < data.selectingEnd ? data.selectingEnd : data.selectingStart
    const next: ClimbEvent = {
      id: `EVT-${Date.now()}`,
      title,
      creator: '我',
      start,
      end,
      createdAt: Date.now(),
      color: data.events.length % 2 === 0 ? 'blue' : 'pink',
    }
    this.setData({
      events: [...data.events, next],
      createVisible: false,
      createTitle: '',
      selectingStart: '',
      selectingEnd: '',
    }, () => this.refreshMonths())
  },

  cancelCreate() {
    this.setData({
      createVisible: false,
      createTitle: '',
      selectingStart: '',
      selectingEnd: '',
    }, () => this.refreshMonths())
  },

  onEventTap(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { expandedEvents: EventPreview[] }).expandedEvents).find((item) => item.id === id)
    if (!found) return
    this.setData({
      editingEvent: found,
      editTitle: found.title,
    })
  },

  onEditInput(event: InputEventLike) {
    this.setData({ editTitle: event.detail.value })
  },

  saveEditedEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      editingEvent: EventPreview | null
      editTitle: string
      expandedDate: string
    }
    if (!data.editingEvent) return
    const title = data.editTitle.trim()
    if (!title) return
    const events = data.events.map((item) => (item.id === data.editingEvent!.id ? { ...item, title } : item))
    this.setData({
      events,
      editingEvent: null,
      editTitle: '',
      expandedEvents: sortedEventsForDate(events, data.expandedDate).map((item) => ({ ...item, range: rangeText(item.start, item.end) })),
    }, () => this.refreshMonths())
  },

  deleteEditingEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      editingEvent: EventPreview | null
      expandedDate: string
    }
    if (!data.editingEvent) return
    const events = data.events.filter((item) => item.id !== data.editingEvent!.id)
    const expandedEvents = sortedEventsForDate(events, data.expandedDate).map((item) => ({ ...item, range: rangeText(item.start, item.end) }))
    this.setData({
      events,
      editingEvent: null,
      editTitle: '',
      expandedEvents,
      expandedDate: expandedEvents.length ? data.expandedDate : '',
    }, () => this.refreshMonths())
  },

  closeExpanded() {
    this.setData({ expandedDate: '', expandedEvents: [] })
  },

  closeEdit() {
    this.setData({ editingEvent: null, editTitle: '' })
  },

  noop() {},

  formatDateTitle(date: string): string {
    const current = dateFromKey(date)
    return `${MONTH_NAMES[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`
  },
})
