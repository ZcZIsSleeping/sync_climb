type TouchEventLike = {
  currentTarget: { dataset: Record<string, string | boolean | number | undefined> }
  touches: Array<{ clientX: number; clientY: number }>
  changedTouches?: Array<{ clientX: number; clientY: number }>
  detail?: { x?: number; y?: number }
}

type InputEventLike = {
  detail: { value: string }
}

type ScrollEventLike = {
  detail: { scrollTop: number }
}

type PickerEventLike = {
  detail: { value: string | number }
}

type TabKey = 'calendar' | 'team' | 'basecamp'
type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

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
  color: 'blue' | 'pink' | 'green' | 'violet'
  eventType?: 'personal' | 'pending_team' | 'team' | 'member_personal'
  teamId?: string
  creatorUserId?: string
  status?: string
}

type InviteEvent = {
  id: string
  title: string
  creator: string
  teamId?: string
  scope: 'calendar' | 'team'
}

type EventSegment = {
  key: string
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

type BuildMonthOptions = {
  maxVisibleEvents: number
}

type EventPreview = ClimbEvent & {
  range: string
}

type GearIconOption = {
  label: string
  icon: string
}

type GearItem = {
  id: string
  name: string
  icon: string
  count: number
  gearTypeId?: string
  userGearId?: string
}

type TeamMember = {
  id: string
  name: string
  avatar: string
  color: 'blue' | 'pink' | 'green' | 'violet'
  gear: GearItem[]
}

type TeamCard = {
  id: string
  avatar: string
  name: string
  roomNo: string
  memberCount: number
  pinned: boolean
}

type TeamCalendarEvent = ClimbEvent & {
  memberId: string
  creatorUserId?: string
  isTeamEvent: boolean
  gearSummary: GearItem[]
}

type MemberGearEditor = {
  member: TeamMember
  expanded: boolean
  allocations: GearItem[]
}

type EventGearRequirement = {
  participantUserId: string
  gearTypeId: string
  userGearId: string
  quantity: number
  name?: string
  iconKey?: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_ROW_HEIGHT_RPX = 1320
const MONTH_HISTORY_WINDOW = 24
const INITIAL_RENDER_AROUND = 3
const INITIAL_MONTH_OFFSET = -INITIAL_RENDER_AROUND
const INITIAL_MONTH_COUNT = INITIAL_RENDER_AROUND * 2 + 1
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GEAR_ICON_OPTIONS: GearIconOption[] = [
  { label: '快挂', icon: 'Q' },
  { label: '主锁', icon: 'L' },
  { label: '机械塞', icon: 'C' },
  { label: '绳索', icon: 'R' },
]
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

const API_BASE = 'http://localhost:8787'
const TEST_ACCOUNTS = [
  { code: 'alice', nickname: 'Alice' },
  { code: 'bob', nickname: 'Bob' },
  { code: 'charlie', nickname: 'Charlie' },
]
const COLORS: Array<'blue' | 'pink' | 'green' | 'violet'> = ['blue', 'pink', 'green', 'violet']
const GEAR_TYPE_BY_LABEL: Record<string, string> = {
  快挂: 'gear_quickdraw',
  主锁: 'gear_locking_carabiner',
  机械塞: 'gear_cam',
  绳索: 'gear_rope',
}
const GEAR_TYPE_META: Record<string, GearIconOption> = GEAR_ICON_OPTIONS.reduce((acc, item) => {
  acc[GEAR_TYPE_BY_LABEL[item.label]] = item
  return acc
}, {} as Record<string, GearIconOption>)

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

function apiCalendarRange() {
  const now = new Date()
  const start = dateKey(new Date(now.getFullYear(), now.getMonth() - MONTH_HISTORY_WINDOW, 1))
  const endMonth = new Date(now.getFullYear(), now.getMonth() + MONTH_HISTORY_WINDOW + 1, 0)
  return { start, end: dateKey(endMonth) }
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
  options: BuildMonthOptions = { maxVisibleEvents: 2 },
  startOffset = INITIAL_MONTH_OFFSET,
): CalendarMonth[] {
  const now = new Date()
  const anchor = new Date(now.getFullYear(), now.getMonth() + startOffset, 1)
  const months: CalendarMonth[] = []
  for (let i = 0; i < monthCount; i += 1) {
    months.push(buildMonth(addMonths(anchor, i), events, selectingStart, selectingEnd, options))
  }
  return months
}

function buildMonth(
  monthDate: Date,
  events: ClimbEvent[],
  selectingStart: string,
  selectingEnd: string,
  options: BuildMonthOptions,
): CalendarMonth {
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
      segments: buildWeekSegments(weekStartDate, monthStartKey, monthEndKey, events, options.maxVisibleEvents),
      moreMarkers: buildWeekMoreMarkers(weekStartDate, monthStartKey, monthEndKey, events, options.maxVisibleEvents),
    })
  }

  return {
    key: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
    title: `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
    weeks,
  }
}

function buildWeekSegments(
  weekStartDate: Date,
  monthStart: string,
  monthEnd: string,
  events: ClimbEvent[],
  maxVisibleEvents: number,
): EventSegment[] {
  const weekStart = dateKey(weekStartDate)
  const weekEnd = dateKey(addDays(weekStartDate, 6))
  const visibleStart = weekStart < monthStart ? monthStart : weekStart
  const visibleEnd = weekEnd > monthEnd ? monthEnd : weekEnd
  const placements: Array<{ event: ClimbEvent; row: number; dayIndex: number; day: string }> = []

  for (let i = 0; i < 7; i += 1) {
    const day = dateKey(addDays(weekStartDate, i))
    if (day < visibleStart || day > visibleEnd) continue
    sortedEventsForDate(events, day)
      .slice(0, maxVisibleEvents)
      .forEach((event, row) => {
        placements.push({ event, row, dayIndex: i, day })
      })
  }

  const segments: EventSegment[] = []
  const sortedPlacements = placements.sort((a, b) => {
    if (a.event.id !== b.event.id) return a.event.id.localeCompare(b.event.id)
    if (a.row !== b.row) return a.row - b.row
    return a.dayIndex - b.dayIndex
  })
  let current: { event: ClimbEvent; row: number; startIndex: number; endIndex: number; startDay: string; endDay: string } | null = null

  const flush = () => {
    if (!current) return
    const first = current.event.start === current.startDay || current.startDay === visibleStart
    const last = current.event.end === current.endDay || current.endDay === visibleEnd
    const radius = `${first ? '999rpx' : '6rpx'} ${last ? '999rpx' : '6rpx'} ${last ? '999rpx' : '6rpx'} ${first ? '999rpx' : '6rpx'}`
    const left = current.startIndex * (100 / 7) + 0.6
    const width = (current.endIndex - current.startIndex + 1) * (100 / 7) - 1.2
    segments.push({
      key: `${current.event.id}-${current.row}-${current.startIndex}-${current.endIndex}`,
      id: current.event.id,
      title: current.event.title,
      creator: current.event.creator,
      color: `event-segment--${current.event.color}${current.event.eventType === 'pending_team' || current.event.status === 'pending' || current.event.status === 'rejected' ? ' event-segment--pending' : ''}`,
      label: `${current.event.title}(${current.event.creator})`,
      style: `left:${left}%;width:${width}%;top:${62 + current.row * 30}rpx;border-radius:${radius};`,
    })
  }

  sortedPlacements.forEach((placement) => {
    if (
      current &&
      current.event.id === placement.event.id &&
      current.row === placement.row &&
      current.endIndex + 1 === placement.dayIndex
    ) {
      current.endIndex = placement.dayIndex
      current.endDay = placement.day
      return
    }
    flush()
    current = {
      event: placement.event,
      row: placement.row,
      startIndex: placement.dayIndex,
      endIndex: placement.dayIndex,
      startDay: placement.day,
      endDay: placement.day,
    }
  })
  flush()

  return segments
}

function buildWeekMoreMarkers(
  weekStartDate: Date,
  monthStart: string,
  monthEnd: string,
  events: ClimbEvent[],
  maxVisibleEvents: number,
): MoreMarker[] {
  const markers: MoreMarker[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = dateKey(addDays(weekStartDate, i))
    if (day < monthStart || day > monthEnd) continue
    const count = sortedEventsForDate(events, day).length
    if (count <= maxVisibleEvents) continue
    markers.push({
      date: day,
      count: count - maxVisibleEvents,
      style: `left:${i * (100 / 7) + 0.6}%;width:${100 / 7 - 1.2}%;top:${62 + maxVisibleEvents * 30}rpx;`,
    })
  }
  return markers
}

Page({
  data: {
    activeTab: 'calendar' as TabKey,
    pageTitle: 'Calendar',
    months: [] as CalendarMonth[],
    currentMonthKey: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
    calendarScrollIntoView: '',
    showTodayButton: false,
    weekdays: WEEKDAYS,
    apiBase: API_BASE,
    authToken: '',
    currentUserId: '',
    testAccounts: TEST_ACCOUNTS,
    events: [] as ClimbEvent[],
    monthCount: INITIAL_MONTH_COUNT,
    monthStartOffset: INITIAL_MONTH_OFFSET,
    scrollEnabled: true,
    selectingStart: '',
    selectingEnd: '',
    createVisible: false,
    createTarget: 'calendar',
    createStart: '',
    createEnd: '',
    createRangeText: '',
    createTitle: '',
    expandedDate: '',
    expandedTitle: '',
    expandedEvents: [] as EventPreview[],
    expandedPanelStyle: '',
    editingEvent: null as EventPreview | null,
    inviteConfirmEvent: null as InviteEvent | null,
    editTitle: '',
    loggedIn: false,
    nickname: '山野同伴',
    gearIconOptions: GEAR_ICON_OPTIONS,
    gearIconLabels: GEAR_ICON_OPTIONS.map((item) => item.label),
    selectedGearIconIndex: 0,
    selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
    selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    newGearName: '',
    gearItems: [] as GearItem[],
    newTeamName: '',
    joinRoomCode: '',
    teamEditVisible: false,
    teamEditClosing: false,
    teams: [] as TeamCard[],
    selectedTeamId: '',
    selectedTeam: null as TeamCard | null,
    teamName: '',
    teamMembers: [] as TeamMember[],
    filteredTeamMembers: [] as TeamMember[],
    teamSearchId: '',
    teamGearExpanded: false,
    teamGearClosing: false,
    teamOnlyFilter: false,
    teamEvents: [] as TeamCalendarEvent[],
    teamMonths: [] as CalendarMonth[],
    teamMonthCount: INITIAL_MONTH_COUNT,
    teamMonthStartOffset: INITIAL_MONTH_OFFSET,
    teamCalendarScrollIntoView: '',
    showTeamTodayButton: false,
    teamSelectingStart: '',
    teamSelectingEnd: '',
    teamEventClosing: false,
    teamDetailEvent: null as TeamCalendarEvent | null,
    eventGearDirty: false,
    otherEventPreview: null as TeamCalendarEvent | null,
    teamDayPreviewDate: '',
    teamDayPreviewTitle: '',
    teamDayPreviewEvents: [] as TeamCalendarEvent[],
    memberGearEditors: [] as MemberGearEditor[],
    gearSummaryDetailVisible: false,
    gearSummaryDetailItems: [] as GearItem[],
    gearSummaryDetailStyle: '',
    dragGhostVisible: false,
    dragGhostLabel: '',
    dragGhostColor: '',
    dragGhostStyle: '',
    dropPreviewVisible: false,
    dropPreviewStyle: '',
    dropPreviewText: '',
    selectionPreviewVisible: false,
    selectionPreviewStyle: '',
    selectionPreviewText: '',
  },

  longPressActive: false,
  touchStartDate: '',
  touchLastDate: '',
  eventDragActive: false,
  eventDragScope: '' as '' | 'calendar' | 'team',
  eventDragId: '',
  eventDragDuration: 1,
  eventDragLastDate: '',
  dragCellRects: [] as Rect[],
  selectionCellRects: [] as Rect[],
  dragVisualPending: false,
  pendingDragGhostStyle: '',
  pendingDropPreviewStyle: '',
  pendingDropPreviewText: '',
  suppressNextEventTap: false,

  onLoad() {
    this.refreshMonths()
    this.refreshTeamMonths()
    setTimeout(() => this.scrollToTodayMonth(), 80)
  },

  api<T>(path: string, method: ApiMethod = 'GET', body?: unknown): Promise<T> {
    const token = (this.data as { authToken: string }).authToken
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}${path}`,
        method,
        data: body,
        header: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as T)
            return
          }
          reject(new Error(`HTTP ${res.statusCode}`))
        },
        fail: reject,
      })
    })
  },

  toast(title: string) {
    wx.showToast({ title, icon: 'none' })
  },

  mapApiEvent(item: any, index = 0): ClimbEvent {
    return {
      id: item.id,
      title: item.title,
      creator: item.creatorName || item.memberName || (item.type === 'personal' ? '我' : 'Team'),
      start: item.startDate,
      end: item.endDate,
      createdAt: Date.now() - index,
      color: item.type === 'pending_team' ? 'pink' : COLORS[index % COLORS.length],
      eventType: item.type,
      teamId: item.teamId,
      creatorUserId: item.creatorUserId,
      status: item.status,
    }
  },

  mapApiTeamEvent(item: any, index = 0): TeamCalendarEvent {
    const isTeamEvent = item.type === 'team'
    return {
      ...this.mapApiEvent(item, index),
      creator: item.creatorName || item.memberName || (isTeamEvent ? 'Team' : '成员'),
      memberId: item.memberId || item.creatorUserId || 'team',
      creatorUserId: item.creatorUserId,
      isTeamEvent,
      gearSummary: [],
    }
  },

  mapApiGear(item: any): GearItem {
    return {
      id: item.id || item.userGearId || item.gearTypeId,
      name: item.name,
      icon: item.icon || item.iconKey || 'G',
      count: item.count ?? item.quantity ?? 0,
      gearTypeId: item.gearTypeId,
      userGearId: item.userGearId || item.id,
    }
  },

  mapApiTeam(item: any): TeamCard {
    return {
      id: item.id,
      avatar: (item.name || 'T').slice(0, 1).toUpperCase(),
      name: item.name,
      roomNo: item.roomCode,
      memberCount: item.memberCount || 1,
      pinned: false,
    }
  },

  ensureLogin(): boolean {
    if ((this.data as { authToken: string }).authToken) return true
    this.toast('请先登录测试账号')
    return false
  },

  async loadAppData() {
    if (!this.ensureLogin()) return
    await Promise.all([
      this.loadCalendarEvents(),
      this.loadGearItems(),
      this.loadTeams(),
    ])
  },

  async loadCalendarEvents() {
    const range = apiCalendarRange()
    const res = await this.api<{ events: any[] }>(`/me/calendar/events?start=${range.start}&end=${range.end}`)
    this.setData({ events: res.events.map((item, index) => this.mapApiEvent(item, index)) }, () => this.refreshMonths())
  },

  async loadGearItems() {
    const res = await this.api<{ gears: any[] }>('/me/gears')
    this.setData({ gearItems: res.gears.map((item) => this.mapApiGear(item)) })
  },

  async loadTeams() {
    const res = await this.api<{ teams: any[] }>('/teams')
    const current = (this.data as { teams: TeamCard[] }).teams
    const pinned = new Set(current.filter((item) => item.pinned).map((item) => item.id))
    this.setData({ teams: res.teams.map((item) => ({ ...this.mapApiTeam(item), pinned: pinned.has(item.id) })) })
  },

  async loadTeamDetailData(teamId: string) {
    const members = await this.api<{ members: any[] }>(`/teams/${teamId}/members`)
    const teamMembers = members.members.map((item, index) => ({
      id: item.id,
      name: item.id === (this.data as { currentUserId: string }).currentUserId ? '我' : item.name,
      avatar: item.avatar || item.name.slice(0, 1).toUpperCase(),
      color: COLORS[index % COLORS.length],
      gear: (item.gear || []).map((gear: any) => this.mapApiGear(gear)),
    }))
    this.setData({ teamMembers, filteredTeamMembers: teamMembers })
    await this.loadTeamEvents(teamId)
  },

  async loadTeamEvents(teamId: string) {
    const range = apiCalendarRange()
    const res = await this.api<{ events: any[] }>(
      `/teams/${teamId}/calendar/events?start=${range.start}&end=${range.end}&onlyTeamEvents=${(this.data as { teamOnlyFilter: boolean }).teamOnlyFilter}`,
    )
    const events = res.events.map((item, index) => this.mapApiTeamEvent(item, index))
    this.setData({ teamEvents: events }, () => this.refreshTeamMonths())
  },

  switchTab(event: TouchEventLike) {
    const tab = String(event.currentTarget.dataset.tab || 'calendar') as TabKey
    const titleMap: Record<TabKey, string> = {
      calendar: 'Calendar',
      team: 'Team',
      basecamp: 'BaseCamp',
    }
    this.setData({
      activeTab: tab,
      pageTitle: titleMap[tab],
      expandedDate: '',
      createVisible: false,
      editingEvent: null,
      ...(tab === 'calendar' ? { calendarScrollIntoView: `month-${(this.data as { currentMonthKey: string }).currentMonthKey}`, showTodayButton: false } : {}),
      ...(tab === 'team' && (this.data as { selectedTeamId: string }).selectedTeamId ? { teamCalendarScrollIntoView: `team-month-${(this.data as { currentMonthKey: string }).currentMonthKey}`, showTeamTodayButton: false } : {}),
    }, () => {
      if (tab === 'calendar') {
        setTimeout(() => this.setData({ calendarScrollIntoView: '' }), 120)
      }
      if (tab === 'team' && (this.data as { selectedTeamId: string }).selectedTeamId) {
        setTimeout(() => this.setData({ teamCalendarScrollIntoView: '' }), 120)
      }
    })
  },

  refreshTeamMonths() {
    const data = this.data as {
      teamEvents: TeamCalendarEvent[]
      teamMonthCount: number
      teamMonthStartOffset: number
      teamSelectingStart: string
      teamSelectingEnd: string
      teamOnlyFilter: boolean
    }
    const events = data.teamOnlyFilter ? data.teamEvents.filter((item) => item.isTeamEvent) : data.teamEvents
    this.setData({
      teamMonths: buildMonths(events, data.teamMonthCount, data.teamSelectingStart, data.teamSelectingEnd, { maxVisibleEvents: 3 }, data.teamMonthStartOffset),
    })
  },

  refreshMonths() {
    const data = this.data as {
      events: ClimbEvent[]
      monthCount: number
      monthStartOffset: number
      selectingStart: string
      selectingEnd: string
    }
    this.setData({
      months: buildMonths(data.events, data.monthCount, data.selectingStart, data.selectingEnd, { maxVisibleEvents: 2 }, data.monthStartOffset),
    })
  },

  onScrollToLower() {
    const data = this.data as { monthCount: number; monthStartOffset: number }
    const nextEndOffset = data.monthStartOffset + data.monthCount - 1
    if (nextEndOffset >= MONTH_HISTORY_WINDOW) return
    this.setData({ monthCount: Math.min(data.monthCount + 3, MONTH_HISTORY_WINDOW - data.monthStartOffset + 1) }, () => this.refreshMonths())
  },

  onScrollToUpper() {
    const data = this.data as { monthCount: number; monthStartOffset: number }
    if (data.monthStartOffset <= -MONTH_HISTORY_WINDOW) return
    const add = Math.min(3, data.monthStartOffset + MONTH_HISTORY_WINDOW)
    this.setData({
      monthStartOffset: data.monthStartOffset - add,
      monthCount: data.monthCount + add,
    }, () => this.refreshMonths())
  },

  onCalendarScroll(event: ScrollEventLike) {
    const system = wx.getSystemInfoSync()
    const pxPerRpx = system.windowWidth / 750
    const currentIndex = Math.max(0, Math.floor(event.detail.scrollTop / (MONTH_ROW_HEIGHT_RPX * pxPerRpx)))
    const monthOffset = (this.data as { monthStartOffset: number }).monthStartOffset + currentIndex
    this.setData({ showTodayButton: monthOffset !== 0 })
  },

  scrollToTodayMonth() {
    const currentMonthKey = (this.data as { currentMonthKey: string }).currentMonthKey
    this.setData({ calendarScrollIntoView: `month-${currentMonthKey}`, showTodayButton: false })
    setTimeout(() => this.setData({ calendarScrollIntoView: '' }), 120)
  },

  onTeamScrollToLower() {
    const data = this.data as { teamMonthCount: number; teamMonthStartOffset: number }
    const nextEndOffset = data.teamMonthStartOffset + data.teamMonthCount - 1
    if (nextEndOffset >= MONTH_HISTORY_WINDOW) return
    this.setData({ teamMonthCount: Math.min(data.teamMonthCount + 3, MONTH_HISTORY_WINDOW - data.teamMonthStartOffset + 1) }, () => this.refreshTeamMonths())
  },

  onTeamScrollToUpper() {
    const data = this.data as { teamMonthCount: number; teamMonthStartOffset: number }
    if (data.teamMonthStartOffset <= -MONTH_HISTORY_WINDOW) return
    const add = Math.min(3, data.teamMonthStartOffset + MONTH_HISTORY_WINDOW)
    this.setData({
      teamMonthStartOffset: data.teamMonthStartOffset - add,
      teamMonthCount: data.teamMonthCount + add,
    }, () => this.refreshTeamMonths())
  },

  onTeamCalendarScroll(event: ScrollEventLike) {
    const system = wx.getSystemInfoSync()
    const pxPerRpx = system.windowWidth / 750
    const currentIndex = Math.max(0, Math.floor(event.detail.scrollTop / (MONTH_ROW_HEIGHT_RPX * pxPerRpx)))
    const monthOffset = (this.data as { teamMonthStartOffset: number }).teamMonthStartOffset + currentIndex
    this.setData({ showTeamTodayButton: monthOffset !== 0 })
  },

  scrollToTeamTodayMonth() {
    const currentMonthKey = (this.data as { currentMonthKey: string }).currentMonthKey
    this.setData({ teamCalendarScrollIntoView: `team-month-${currentMonthKey}`, showTeamTodayButton: false })
    setTimeout(() => this.setData({ teamCalendarScrollIntoView: '' }), 120)
  },

  async enterTeam(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const team = ((this.data as { teams: TeamCard[] }).teams).find((item) => item.id === id)
    if (!team) return
    this.setData({
      selectedTeamId: id,
      selectedTeam: team,
      teamName: team.name,
      pageTitle: 'Team',
      teamGearExpanded: false,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      teamDetailEvent: null,
    })
    await this.loadTeamDetailData(id)
    this.scrollToTeamTodayMonth()
  },

  backToTeamList() {
    this.setData({
      selectedTeamId: '',
      selectedTeam: null,
      teamName: '',
      teamGearExpanded: false,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      teamDetailEvent: null,
    })
  },

  pinTeam(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const currentTeams = (this.data as { teams: TeamCard[] }).teams
    const target = currentTeams.find((item) => item.id === id)
    if (!target) return
    const remaining = currentTeams.filter((item) => item.id !== id)
    const pinnedTeams = remaining.filter((item) => item.pinned)
    const normalTeams = remaining.filter((item) => !item.pinned)
    const moved = { ...target, pinned: !target.pinned }
    const teams = moved.pinned
      ? [moved, ...pinnedTeams, ...normalTeams]
      : [...pinnedTeams, moved, ...normalTeams]
    this.setData({ teams })
  },

  exitTeam(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    this.api(`/teams/${id}/leave`, 'DELETE')
      .then(() => this.loadTeams())
      .catch(() => this.toast('退出团队失败'))
  },

  onTeamNameInput(event: InputEventLike) {
    const teamName = event.detail.value
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    const teams = ((this.data as { teams: TeamCard[] }).teams).map((item) => (
      item.id === selectedTeamId ? { ...item, name: teamName } : item
    ))
    this.setData({ teamName, teams })
  },

  onNewTeamNameInput(event: InputEventLike) {
    this.setData({ newTeamName: event.detail.value })
  },

  onJoinRoomInput(event: InputEventLike) {
    this.setData({ joinRoomCode: event.detail.value })
  },

  openTeamEditPanel() {
    this.setData({ teamEditVisible: true, teamEditClosing: false })
  },

  closeTeamEditPanel() {
    this.setData({ teamEditClosing: true })
    setTimeout(() => {
      this.setData({ teamEditVisible: false, teamEditClosing: false })
    }, 220)
  },

  randomTeamName(): string {
    return `Team-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  },

  async createTeam() {
    if (!this.ensureLogin()) return
    const name = this.randomTeamName()
    await this.api('/teams', 'POST', { name })
    this.setData({ newTeamName: '' })
    await this.loadTeams()
    this.closeTeamEditPanel()
  },

  async joinTeam() {
    if (!this.ensureLogin()) return
    const roomCode = (this.data as { joinRoomCode: string }).joinRoomCode.trim()
    if (!roomCode) return
    await this.api('/teams/join', 'POST', { roomCode })
    this.setData({ joinRoomCode: '' })
    await this.loadTeams()
    this.closeTeamEditPanel()
  },

  saveTeamName() {
    const data = this.data as { selectedTeamId: string; teamName: string }
    if (!data.selectedTeamId || !data.teamName.trim()) return
    this.api(`/teams/${data.selectedTeamId}`, 'PATCH', { name: data.teamName.trim() })
      .then(() => this.loadTeams())
      .catch(() => this.toast('团队名保存失败'))
  },

  copyRoomNo() {
    const team = (this.data as { selectedTeam: TeamCard | null }).selectedTeam
    if (!team) return
    wx.setClipboardData({ data: team.roomNo })
    wx.vibrateShort({ type: 'light' })
  },

  toggleTeamFilter() {
    const next = !(this.data as { teamOnlyFilter: boolean }).teamOnlyFilter
    const teamId = (this.data as { selectedTeamId: string }).selectedTeamId
    this.setData({ teamOnlyFilter: next }, () => {
      if (teamId) this.loadTeamEvents(teamId)
      else this.refreshTeamMonths()
    })
  },

  toggleTeamGearPanel() {
    const data = this.data as { teamGearExpanded: boolean }
    if (!data.teamGearExpanded) {
      this.setData({ teamGearExpanded: true, teamGearClosing: false })
      return
    }
    this.setData({ teamGearClosing: true })
    setTimeout(() => {
      this.setData({ teamGearExpanded: false, teamGearClosing: false })
    }, 240)
  },

  onTeamSearchInput(event: InputEventLike) {
    const teamSearchId = event.detail.value
    const members = (this.data as { teamMembers: TeamMember[] }).teamMembers
    const filteredTeamMembers = teamSearchId.trim()
      ? members.filter((item) => item.id.includes(teamSearchId.trim()) || item.name.includes(teamSearchId.trim()))
      : members
    this.setData({ teamSearchId, filteredTeamMembers })
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
    this.cacheSelectionCellRects('.day-cell')
    this.setData({
      scrollEnabled: false,
      selectingStart: '',
      selectingEnd: '',
      expandedDate: '',
      selectionPreviewVisible: true,
      selectionPreviewText: rangeText(date, date),
      selectionPreviewStyle: this.selectionPreviewStyleFromEvent(event),
    })
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
    this.selectionCellRects = []
    this.setData({
      scrollEnabled: true,
      selectingStart: '',
      selectingEnd: '',
      createVisible: true,
      createTarget: 'calendar',
      createStart: start,
      createEnd: end,
      createRangeText: rangeText(start, end),
      createTitle: '',
      selectionPreviewVisible: false,
    })
  },

  onTeamDayTouchStart(event: TouchEventLike) {
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    this.touchStartDate = date
    this.touchLastDate = date
  },

  onTeamDayLongPress(event: TouchEventLike) {
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    wx.vibrateShort({ type: 'light' })
    this.longPressActive = true
    this.touchStartDate = date
    this.touchLastDate = date
    this.cacheSelectionCellRects('.team-day-cell')
    this.setData({
      scrollEnabled: false,
      teamSelectingStart: '',
      teamSelectingEnd: '',
      teamDetailEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      selectionPreviewVisible: true,
      selectionPreviewText: rangeText(date, date),
      selectionPreviewStyle: this.selectionPreviewStyleFromEvent(event),
    })
  },

  onTeamDayTouchMove(event: TouchEventLike) {
    if (!this.longPressActive) return
    const touch = event.touches[0]
    this.updateTeamSelectionFromPoint(touch.clientX, touch.clientY)
  },

  onTeamDayTouchEnd() {
    if (!this.longPressActive) return
    const start = this.touchStartDate < this.touchLastDate ? this.touchStartDate : this.touchLastDate
    const end = this.touchStartDate < this.touchLastDate ? this.touchLastDate : this.touchStartDate
    this.longPressActive = false
    this.selectionCellRects = []
    this.setData({
      scrollEnabled: true,
      teamSelectingStart: '',
      teamSelectingEnd: '',
      createVisible: true,
      createTarget: 'team',
      createStart: start,
      createEnd: end,
      createRangeText: rangeText(start, end),
      createTitle: '',
      selectionPreviewVisible: false,
    })
  },

  updateTeamSelectionFromPoint(x: number, y: number) {
    this.updateSelectionPreviewFromPoint(x, y, 'td')
  },

  async openTeamEventDetail(found: TeamCalendarEvent, explicitTeamId?: string) {
    const teamId = explicitTeamId || found.teamId || (this.data as { selectedTeamId: string }).selectedTeamId
    if (!teamId) return
    const detail = await this.api<{
      gearSummary: any[]
      participants: Array<{ userId: string }>
      requirements: EventGearRequirement[]
    }>(`/teams/${teamId}/events/${found.id}`)
    const eventWithGear = {
      ...found,
      teamId,
      gearSummary: (detail.gearSummary || []).map((item) => this.mapApiGear({ ...item, id: item.gearTypeId, count: item.quantity })),
    }
    this.setData({
      teamDetailEvent: eventWithGear,
      memberGearEditors: this.buildMemberGearEditors(
        eventWithGear,
        detail.participants.map((item) => item.userId),
        detail.requirements || [],
      ),
      eventGearDirty: false,
    })
  },

  openInviteConfirm(found: ClimbEvent | TeamCalendarEvent, scope: 'calendar' | 'team') {
    this.setData({
      inviteConfirmEvent: {
        id: found.id,
        title: found.title,
        creator: found.creator,
        teamId: found.teamId || (this.data as { selectedTeamId: string }).selectedTeamId,
        scope,
      },
      editingEvent: null,
      expandedDate: '',
      teamDayPreviewDate: '',
    })
  },

  async openJoinedTeamEventFromCalendar(found: ClimbEvent) {
    if (!found.teamId) return
    this.setData({
      expandedDate: '',
      expandedEvents: [],
      editingEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
    })
    const members = await this.api<{ members: any[] }>(`/teams/${found.teamId}/members`)
    const teamMembers = members.members.map((item, index) => ({
      id: item.id,
      name: item.id === (this.data as { currentUserId: string }).currentUserId ? '我' : item.name,
      avatar: item.avatar || item.name.slice(0, 1).toUpperCase(),
      color: COLORS[index % COLORS.length],
      gear: (item.gear || []).map((gear: any) => this.mapApiGear(gear)),
    }))
    this.setData({ teamMembers, filteredTeamMembers: teamMembers })
    await this.openTeamEventDetail({
      ...found,
      memberId: found.creator,
      creatorUserId: found.creatorUserId,
      isTeamEvent: true,
      gearSummary: [],
    }, found.teamId)
  },

  onTeamEventTap(event: TouchEventLike) {
    if (this.suppressNextEventTap) {
      this.suppressNextEventTap = false
      return
    }
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === id)
    if (!found) return
    if (!found.isTeamEvent) {
      this.setData({ otherEventPreview: found })
      return
    }
    if (found.status === 'pending' || found.status === 'rejected') {
      this.openInviteConfirm(found, 'team')
      return
    }
    this.openTeamEventDetail(found)
  },

  onTeamEventLongPress(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === id)
    if (!found || !found.isTeamEvent) return
    if (found.status === 'pending' || found.status === 'rejected') return
    const currentUserId = (this.data as { currentUserId: string }).currentUserId
    if (found.creatorUserId && found.creatorUserId !== currentUserId) {
      return
    }
    wx.vibrateShort({ type: 'light' })
    this.eventDragActive = true
    this.eventDragScope = 'team'
    this.eventDragId = id
    this.eventDragDuration = durationDays(found)
    this.eventDragLastDate = found.start
    this.cacheDragCellRects('.team-day-cell')
    this.setData({
      scrollEnabled: false,
      teamSelectingStart: '',
      teamSelectingEnd: '',
      teamDetailEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      dragGhostVisible: true,
      dragGhostLabel: `${found.title}(${found.creator})`,
      dragGhostColor: `event-segment--${found.color}`,
      dragGhostStyle: this.dragGhostStyleFromEvent(event),
      dropPreviewVisible: true,
      dropPreviewText: rangeText(found.start, found.end),
      dropPreviewStyle: this.dropPreviewStyleFromEvent(event),
    })
  },

  onTeamEventTouchMove(event: TouchEventLike) {
    if (!this.eventDragActive || this.eventDragScope !== 'team') return
    const touch = event.touches[0]
    this.queueDragVisual(touch.clientX, touch.clientY)
    this.updateEventDragFromPoint(touch.clientX, touch.clientY, '.team-day-cell')
  },

  async onTeamEventTouchEnd() {
    if (!this.eventDragActive || this.eventDragScope !== 'team') return
    const target = this.eventDragLastDate
    const id = this.eventDragId
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    this.resetEventDrag()
    this.setData({
      scrollEnabled: true,
      teamSelectingStart: '',
      teamSelectingEnd: '',
      dragGhostVisible: false,
      dropPreviewVisible: false,
    })
    if (selectedTeamId) {
      try {
        await this.api(`/teams/${selectedTeamId}/events/${id}/move`, 'PATCH', { startDate: target })
      } catch (error) {
      }
      await this.loadTeamEvents(selectedTeamId)
    }
  },

  onTeamMoreTap(event: TouchEventLike) {
    const date = String(event.currentTarget.dataset.date || '')
    const events = this.getVisibleTeamEventsForDate(date)
    if (!events.length) return
    this.setData({
      teamDayPreviewDate: date,
      teamDayPreviewTitle: this.formatDateTitle(date),
      teamDayPreviewEvents: events,
    })
  },

  closeTeamDayPreview() {
    this.setData({ teamDayPreviewDate: '', teamDayPreviewEvents: [] })
  },

  onTeamPreviewEventTap(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === id)
    if (!found) return
    this.setData({ teamDayPreviewDate: '', teamDayPreviewEvents: [] })
    if (!found.isTeamEvent) {
      this.setData({ otherEventPreview: found })
      return
    }
    if (found.status === 'pending' || found.status === 'rejected') {
      this.openInviteConfirm(found, 'team')
      return
    }
    this.openTeamEventDetail(found)
  },

  getVisibleTeamEventsForDate(date: string): TeamCalendarEvent[] {
    const data = this.data as { teamEvents: TeamCalendarEvent[]; teamOnlyFilter: boolean }
    const events = data.teamOnlyFilter ? data.teamEvents.filter((item) => item.isTeamEvent) : data.teamEvents
    return sortedEventsForDate(events, date) as TeamCalendarEvent[]
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

  async onCalendarEventTap(event: TouchEventLike) {
    if (this.suppressNextEventTap) {
      this.suppressNextEventTap = false
      return
    }
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { events: ClimbEvent[] }).events).find((item) => item.id === id)
    if (!found) return
    if (found.eventType === 'pending_team') {
      this.openInviteConfirm(found, 'calendar')
      return
    }
    if (found.eventType === 'team') {
      await this.openJoinedTeamEventFromCalendar(found)
      return
    }
    if (found.eventType && found.eventType !== 'personal') return
    this.setData({
      expandedDate: '',
      expandedEvents: [],
      editingEvent: { ...found, range: rangeText(found.start, found.end) },
      editTitle: found.title,
    })
  },

  onCalendarMoreTap(event: TouchEventLike) {
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

  onCalendarEventLongPress(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { events: ClimbEvent[] }).events).find((item) => item.id === id)
    if (!found) return
    if (found.eventType && found.eventType !== 'personal') return
    wx.vibrateShort({ type: 'light' })
    this.eventDragActive = true
    this.eventDragScope = 'calendar'
    this.eventDragId = id
    this.eventDragDuration = durationDays(found)
    this.eventDragLastDate = found.start
    this.cacheDragCellRects('.day-cell')
    this.setData({
      scrollEnabled: false,
      selectingStart: '',
      selectingEnd: '',
      expandedDate: '',
      editingEvent: null,
      dragGhostVisible: true,
      dragGhostLabel: `${found.title}(${found.creator})`,
      dragGhostColor: `event-segment--${found.color}`,
      dragGhostStyle: this.dragGhostStyleFromEvent(event),
      dropPreviewVisible: true,
      dropPreviewText: rangeText(found.start, found.end),
      dropPreviewStyle: this.dropPreviewStyleFromEvent(event),
    })
  },

  onCalendarEventTouchMove(event: TouchEventLike) {
    if (!this.eventDragActive || this.eventDragScope !== 'calendar') return
    const touch = event.touches[0]
    this.queueDragVisual(touch.clientX, touch.clientY)
    this.updateEventDragFromPoint(touch.clientX, touch.clientY, '.day-cell')
  },

  async onCalendarEventTouchEnd() {
    if (!this.eventDragActive || this.eventDragScope !== 'calendar') return
    const target = this.eventDragLastDate
    const id = this.eventDragId
    const duration = this.eventDragDuration
    const dragged = ((this.data as { events: ClimbEvent[] }).events).find((item) => item.id === id)
    if (dragged?.eventType && dragged.eventType !== 'personal') {
      this.resetEventDrag()
      this.setData({
        scrollEnabled: true,
        selectingStart: '',
        selectingEnd: '',
        dragGhostVisible: false,
        dropPreviewVisible: false,
      })
      this.toast('团队日程请在团队页移动')
      return
    }
    this.resetEventDrag()
    this.setData({
      scrollEnabled: true,
      selectingStart: '',
      selectingEnd: '',
      dragGhostVisible: false,
      dropPreviewVisible: false,
    })
    try {
      await this.api(`/me/events/${id}/move`, 'PATCH', { startDate: target })
    } catch (error) {
      this.toast('移动事件失败')
    }
    await this.loadCalendarEvents()
  },

  cacheDragCellRects(selector: string) {
    wx.createSelectorQuery()
      .selectAll(selector)
      .boundingClientRect((rects) => {
        this.dragCellRects = rects.filter((rect) => rect.id)
      })
      .exec()
  },

  updateEventDragFromPoint(x: number, y: number, _selector: string) {
    const match = this.dragCellRects.find((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    if (!match || !match.id) return
    const date = match.id.replace(/^td/, '').replace(/^d/, '')
    if (date === this.eventDragLastDate) return
    this.eventDragLastDate = date
    this.pendingDropPreviewStyle = this.dropPreviewStyleFromRect(match)
    this.pendingDropPreviewText = rangeText(date, dateKey(addDays(dateFromKey(date), this.eventDragDuration - 1)))
  },

  resetEventDrag() {
    this.eventDragActive = false
    this.eventDragScope = ''
    this.eventDragId = ''
    this.eventDragDuration = 1
    this.eventDragLastDate = ''
    this.dragCellRects = []
    this.dragVisualPending = false
    this.pendingDragGhostStyle = ''
    this.pendingDropPreviewStyle = ''
    this.pendingDropPreviewText = ''
    this.suppressNextEventTap = true
    this.setData({
      dragGhostVisible: false,
      dragGhostLabel: '',
      dragGhostColor: '',
      dragGhostStyle: '',
      dropPreviewVisible: false,
      dropPreviewStyle: '',
      dropPreviewText: '',
    })
    setTimeout(() => {
      this.suppressNextEventTap = false
    }, 360)
  },

  dragGhostStyleFromEvent(event: TouchEventLike): string {
    const touch = event.touches[0]
    if (!touch) return this.dragGhostStyle(92, 18)
    return this.dragGhostStyle(touch.clientX, touch.clientY)
  },

  dragGhostStyle(x: number, y: number): string {
    return `left:${Math.max(12, x - 92)}px;top:${Math.max(12, y - 18)}px;`
  },

  cacheSelectionCellRects(selector: string) {
    wx.createSelectorQuery()
      .selectAll(selector)
      .boundingClientRect((rects) => {
        this.selectionCellRects = rects.filter((rect) => rect.id)
      })
      .exec()
  },

  selectionPreviewStyleFromEvent(event: TouchEventLike): string {
    const touch = event.touches[0]
    if (!touch) return ''
    return `left:${Math.max(12, touch.clientX - 44)}px;top:${Math.max(12, touch.clientY + 24)}px;`
  },

  updateSelectionPreviewFromPoint(x: number, y: number, prefix: 'd' | 'td') {
    const match = this.selectionCellRects.find((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
    if (!match || !match.id) return
    const date = match.id.replace(new RegExp(`^${prefix}`), '')
    if (date === this.touchLastDate) return
    this.touchLastDate = date
    const start = this.touchStartDate < this.touchLastDate ? this.touchStartDate : this.touchLastDate
    const end = this.touchStartDate < this.touchLastDate ? this.touchLastDate : this.touchStartDate
    this.setData({
      selectionPreviewStyle: this.dropPreviewStyleFromRect(match),
      selectionPreviewText: rangeText(start, end),
    })
  },

  dropPreviewStyleFromEvent(event: TouchEventLike): string {
    const touch = event.touches[0]
    if (!touch) return ''
    return `left:${Math.max(12, touch.clientX - 44)}px;top:${Math.max(12, touch.clientY + 24)}px;`
  },

  dropPreviewStyleFromRect(rect: Rect): string {
    return `left:${rect.left + 4}px;top:${rect.top + 4}px;width:${Math.max(28, rect.width - 8)}px;height:${Math.max(28, rect.height - 8)}px;`
  },

  queueDragVisual(x: number, y: number) {
    this.pendingDragGhostStyle = this.dragGhostStyle(x, y)
    if (!this.dragVisualPending) {
      this.dragVisualPending = true
      setTimeout(() => {
        this.dragVisualPending = false
        if (!this.eventDragActive) return
        const data: Record<string, string> = { dragGhostStyle: this.pendingDragGhostStyle }
        if (this.pendingDropPreviewStyle) data.dropPreviewStyle = this.pendingDropPreviewStyle
        if (this.pendingDropPreviewText) data.dropPreviewText = this.pendingDropPreviewText
        this.setData(data)
      }, 16)
    }
  },

  updateSelectionFromPoint(x: number, y: number) {
    this.updateSelectionPreviewFromPoint(x, y, 'd')
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

  async login(event: TouchEventLike) {
    const index = Number(event.currentTarget.dataset.index || 0)
    const account = TEST_ACCOUNTS[index] || TEST_ACCOUNTS[0]
    try {
      const res = await this.api<{ token: string; user: { id: string; nickname: string; avatarUrl: string } }>('/auth/wechat-login', 'POST', {
        code: account.code,
        nickname: account.nickname,
        avatarUrl: '',
      })
      this.setData({
        loggedIn: true,
        authToken: res.token,
        currentUserId: res.user.id,
        nickname: res.user.nickname,
      })
      await this.loadAppData()
      this.toast(`已登录 ${res.user.nickname}`)
    } catch (error) {
      this.toast('登录失败，请确认后端已启动')
    }
  },

  logout() {
    this.setData({
      loggedIn: false,
      authToken: '',
      currentUserId: '',
      nickname: '山野同伴',
      events: [],
      monthStartOffset: INITIAL_MONTH_OFFSET,
      monthCount: INITIAL_MONTH_COUNT,
      gearItems: [],
      teams: [],
      selectedTeamId: '',
      selectedTeam: null,
      teamName: '',
      teamMembers: [],
      filteredTeamMembers: [],
      teamEvents: [],
      teamMonthStartOffset: INITIAL_MONTH_OFFSET,
      teamMonthCount: INITIAL_MONTH_COUNT,
      teamDetailEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      expandedDate: '',
      editingEvent: null,
    }, () => {
      this.refreshMonths()
      this.refreshTeamMonths()
      this.scrollToTodayMonth()
    })
  },

  onNicknameInput(event: InputEventLike) {
    this.setData({ nickname: event.detail.value })
  },

  async saveNickname() {
    if (!this.ensureLogin()) return
    const nickname = (this.data as { nickname: string }).nickname.trim()
    if (!nickname) return
    await this.api('/me/profile', 'PATCH', { nickname })
    this.toast('昵称已保存')
  },

  onGearIconChange(event: PickerEventLike) {
    const index = Number(event.detail.value)
    const option = GEAR_ICON_OPTIONS[index] || GEAR_ICON_OPTIONS[0]
    this.setData({
      selectedGearIconIndex: index,
      selectedGearIcon: option.icon,
      selectedGearIconLabel: option.label,
    })
  },

  onGearNameInput(event: InputEventLike) {
    this.setData({ newGearName: event.detail.value })
  },

  buildMemberGearEditors(event: TeamCalendarEvent, participantIds?: string[], requirements: EventGearRequirement[] = []): MemberGearEditor[] {
    const members = (this.data as { teamMembers: TeamMember[] }).teamMembers
    const visibleMembers = participantIds ? members.filter((member) => participantIds.includes(member.id)) : members
    return visibleMembers.map((member) => ({
      member,
      expanded: false,
      allocations: member.gear.map((gear) => {
        const current = requirements.find((item) => (
          item.participantUserId === member.id
          && item.userGearId === (gear.userGearId || gear.id)
        ))
        return {
          ...gear,
          count: current ? Math.min(current.quantity, gear.count) : 0,
        }
      }),
    }))
  },

  closeOtherEventPreview() {
    this.setData({ otherEventPreview: null })
  },

  async closeTeamEventDetail() {
    await this.submitEventGearIfDirty()
    this.setData({ teamEventClosing: true })
    setTimeout(() => {
      this.setData({
        teamDetailEvent: null,
        memberGearEditors: [],
        teamEventClosing: false,
        eventGearDirty: false,
        gearSummaryDetailVisible: false,
        gearSummaryDetailItems: [],
      })
    }, 240)
  },

  toggleMemberGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const editors = ((this.data as { memberGearEditors: MemberGearEditor[] }).memberGearEditors).map((item) => {
      if (item.member.id !== id) return item
      return { ...item, expanded: !item.expanded }
    })
    this.setData({ memberGearEditors: editors })
  },

  changeEventGear(event: TouchEventLike, delta: number) {
    const memberId = String(event.currentTarget.dataset.member || '')
    const gearId = String(event.currentTarget.dataset.gear || '')
    const data = this.data as {
      memberGearEditors: MemberGearEditor[]
      teamDetailEvent: TeamCalendarEvent | null
      teamEvents: TeamCalendarEvent[]
      currentUserId: string
    }
    if (!data.teamDetailEvent) return
    if (data.teamDetailEvent.creatorUserId !== data.currentUserId) return
    let blocked = false
    const editors = data.memberGearEditors.map((editor) => {
      if (editor.member.id !== memberId) return editor
      const allocations = editor.allocations.map((gear) => {
        if (gear.id !== gearId) return gear
        const owned = editor.member.gear.find((item) => item.id === gearId)?.count || 0
        const next = gear.count + delta
        if (next < 0 || next > owned) {
          blocked = true
          return gear
        }
        return { ...gear, count: next }
      })
      return { ...editor, allocations }
    })
    wx.vibrateShort({ type: blocked ? 'heavy' : 'light' })
    if (blocked) return
    const gearSummary = this.mergeEventGear(editors)
    const updatedEvent = { ...data.teamDetailEvent, gearSummary }
    const teamEvents = data.teamEvents.map((item) => (item.id === updatedEvent.id ? updatedEvent : item))
    this.setData({
      memberGearEditors: editors,
      teamDetailEvent: updatedEvent,
      teamEvents,
      eventGearDirty: true,
    })
  },

  decreaseEventGear(event: TouchEventLike) {
    this.changeEventGear(event, -1)
  },

  increaseEventGear(event: TouchEventLike) {
    this.changeEventGear(event, 1)
  },

  async submitEventGearIfDirty() {
    const data = this.data as {
      eventGearDirty: boolean
      memberGearEditors: MemberGearEditor[]
      teamDetailEvent: TeamCalendarEvent | null
      selectedTeamId: string
    }
    if (!data.eventGearDirty || !data.teamDetailEvent) return
    const teamId = data.teamDetailEvent.teamId || data.selectedTeamId
    if (!teamId) return
    const requirements = data.memberGearEditors.flatMap((editor) => (
      editor.allocations.map((gear) => ({
        participantUserId: editor.member.id,
        gearTypeId: gear.gearTypeId || gear.id,
        userGearId: gear.userGearId || gear.id,
        quantity: gear.count,
      }))
    ))
    try {
      await this.api(`/teams/${teamId}/events/${data.teamDetailEvent.id}/gear-requirements`, 'PATCH', { requirements })
      this.setData({ eventGearDirty: false })
    } catch (error) {
      this.toast('装备分配保存失败')
    }
  },

  mergeEventGear(editors: MemberGearEditor[]): GearItem[] {
    const merged = new Map<string, GearItem>()
    editors.forEach((editor) => {
      editor.allocations.forEach((gear) => {
        if (gear.count <= 0) return
        const gearTypeId = gear.gearTypeId || gear.id
        const current = merged.get(gearTypeId)
        const meta = GEAR_TYPE_META[gearTypeId]
        if (current) {
          merged.set(gearTypeId, { ...current, count: current.count + gear.count })
          return
        }
        merged.set(gearTypeId, {
          id: gearTypeId,
          name: meta?.label || gear.name,
          icon: meta?.icon || gear.icon,
          count: gear.count,
          gearTypeId,
        })
      })
    })
    return Array.from(merged.values())
  },

  onGearSummaryLongPress(event: TouchEventLike) {
    const gearTypeId = String(event.currentTarget.dataset.geartype || '')
    if (!gearTypeId) return
    wx.vibrateShort({ type: 'light' })
    const detailItems = ((this.data as { memberGearEditors: MemberGearEditor[] }).memberGearEditors).flatMap((editor) => (
      editor.allocations
        .filter((gear) => (gear.gearTypeId || gear.id) === gearTypeId && gear.count > 0)
        .map((gear) => ({ ...gear, id: `${editor.member.id}-${gear.userGearId || gear.id}` }))
    ))
    if (!detailItems.length) return
    const touch = event.touches?.[0] || event.changedTouches?.[0]
    const x = touch?.clientX || event.detail?.x || 180
    const y = touch?.clientY || event.detail?.y || 320
    this.setData({
      gearSummaryDetailVisible: true,
      gearSummaryDetailItems: detailItems,
      gearSummaryDetailStyle: `left:${x}px;top:${y}px;`,
    })
  },

  hideGearSummaryDetail() {
    this.setData({ gearSummaryDetailVisible: false, gearSummaryDetailItems: [] })
  },

  async deleteTeamEvent() {
    const data = this.data as { teamDetailEvent: TeamCalendarEvent | null; teamEvents: TeamCalendarEvent[] }
    if (!data.teamDetailEvent) return
    wx.vibrateShort({ type: 'light' })
    const teamId = data.teamDetailEvent.teamId || (this.data as { selectedTeamId: string }).selectedTeamId
    if (teamId) await this.api(`/teams/${teamId}/events/${data.teamDetailEvent.id}`, 'DELETE')
    const teamEvents = data.teamEvents.filter((item) => item.id !== data.teamDetailEvent!.id)
    this.setData({
      teamEvents,
      teamDetailEvent: null,
      memberGearEditors: [],
      eventGearDirty: false,
    }, () => this.refreshTeamMonths())
  },

  async addGear() {
    if (!this.ensureLogin()) return
    const data = this.data as {
      gearItems: GearItem[]
      gearIconOptions: GearIconOption[]
      selectedGearIconIndex: number
      newGearName: string
    }
    const name = data.newGearName.trim()
    if (!name) return
    const option = data.gearIconOptions[data.selectedGearIconIndex] || data.gearIconOptions[0]
    wx.vibrateShort({ type: 'light' })
    const res = await this.api<{ gear: any }>('/me/gears', 'POST', {
      gearTypeId: GEAR_TYPE_BY_LABEL[option.label] || 'gear_quickdraw',
      name,
      quantity: 1,
    })
    const next = this.mapApiGear({ ...res.gear, icon: option.icon, count: res.gear.quantity })
    this.setData({
      gearItems: [next, ...data.gearItems],
      newGearName: '',
      selectedGearIconIndex: 0,
      selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
      selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    })
  },

  async decreaseGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const current = ((this.data as { gearItems: GearItem[] }).gearItems).find((item) => item.id === id)
    if (!current) return
    const nextCount = Math.max(0, current.count - 1)
    await this.api(`/me/gears/${id}`, 'PATCH', { quantity: nextCount })
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: nextCount }
    })
    this.setData({ gearItems })
  },

  async increaseGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const current = ((this.data as { gearItems: GearItem[] }).gearItems).find((item) => item.id === id)
    if (!current) return
    const nextCount = current.count + 1
    await this.api(`/me/gears/${id}`, 'PATCH', { quantity: nextCount })
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: nextCount }
    })
    this.setData({ gearItems })
  },

  async deleteGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    await this.api(`/me/gears/${id}`, 'DELETE')
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).filter((item) => item.id !== id)
    this.setData({ gearItems })
  },

  async saveCreatedEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      teamEvents: TeamCalendarEvent[]
      selectingStart: string
      selectingEnd: string
      teamSelectingStart: string
      teamSelectingEnd: string
      createTitle: string
      createTarget: string
      createStart: string
      createEnd: string
    }
    const title = data.createTitle.trim()
    if (!title) return
    if (data.createTarget === 'team') {
      const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
      if (!selectedTeamId) return
      const start = data.createStart
      const end = data.createEnd
      const currentUserId = (this.data as { currentUserId: string }).currentUserId
      const participantUserIds = (this.data as { teamMembers: TeamMember[] }).teamMembers
        .map((member) => member.id)
        .filter((id) => id !== currentUserId)
      await this.api(`/teams/${selectedTeamId}/events`, 'POST', { title, startDate: start, endDate: end, participantUserIds })
      this.setData({
        createVisible: false,
        createTitle: '',
        createStart: '',
        createEnd: '',
        teamSelectingStart: '',
        teamSelectingEnd: '',
      })
      await this.loadTeamEvents(selectedTeamId)
      await this.loadCalendarEvents()
      return
    }
    const start = data.createStart
    const end = data.createEnd
    const res = await this.api<{ event: any }>('/me/events', 'POST', { title, startDate: start, endDate: end })
    const next = this.mapApiEvent({ ...res.event, type: 'personal' }, data.events.length)
    this.setData({
      events: [...data.events, next],
      createVisible: false,
      createTitle: '',
      createStart: '',
      createEnd: '',
      selectingStart: '',
      selectingEnd: '',
    }, () => this.refreshMonths())
  },

  cancelCreate() {
    this.setData({
      createVisible: false,
      createTitle: '',
      createStart: '',
      createEnd: '',
      selectingStart: '',
      selectingEnd: '',
      teamSelectingStart: '',
      teamSelectingEnd: '',
      selectionPreviewVisible: false,
    }, () => {
      this.refreshMonths()
      this.refreshTeamMonths()
    })
  },

  async onEventTap(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { expandedEvents: EventPreview[] }).expandedEvents).find((item) => item.id === id)
    if (!found) return
    if (found.eventType === 'pending_team') {
      this.openInviteConfirm(found, 'calendar')
      return
    }
    if (found.eventType === 'team') {
      await this.openJoinedTeamEventFromCalendar(found)
      return
    }
    if (found.eventType && found.eventType !== 'personal') return
    this.setData({
      editingEvent: found,
      editTitle: found.title,
    })
  },

  onEditInput(event: InputEventLike) {
    this.setData({ editTitle: event.detail.value })
  },

  async saveEditedEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      editingEvent: EventPreview | null
      editTitle: string
      expandedDate: string
    }
    if (!data.editingEvent) return
    if (data.editingEvent.eventType && data.editingEvent.eventType !== 'personal') return
    const title = data.editTitle.trim()
    if (!title) return
    await this.api(`/me/events/${data.editingEvent.id}`, 'PATCH', { title })
    const events = data.events.map((item) => (item.id === data.editingEvent!.id ? { ...item, title } : item))
    this.setData({
      events,
      editingEvent: null,
      editTitle: '',
      expandedEvents: sortedEventsForDate(events, data.expandedDate).map((item) => ({ ...item, range: rangeText(item.start, item.end) })),
    }, () => this.refreshMonths())
  },

  async deleteEditingEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      editingEvent: EventPreview | null
      expandedDate: string
    }
    if (!data.editingEvent) return
    if (data.editingEvent.eventType && data.editingEvent.eventType !== 'personal') return
    await this.api(`/me/events/${data.editingEvent.id}`, 'DELETE')
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

  closeInviteConfirm() {
    this.setData({ inviteConfirmEvent: null })
  },

  async acceptInviteEvent() {
    const invite = (this.data as { inviteConfirmEvent: InviteEvent | null }).inviteConfirmEvent
    if (!invite) return
    await this.api(`/me/events/${invite.id}/accept`, 'POST')
    this.setData({ inviteConfirmEvent: null, editingEvent: null, editTitle: '' })
    await this.loadCalendarEvents()
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    const teamId = invite.teamId || selectedTeamId
    if (teamId) {
      if (selectedTeamId !== teamId) {
        await this.loadTeams()
        const team = ((this.data as { teams: TeamCard[] }).teams).find((item) => item.id === teamId) || null
        this.setData({
          activeTab: 'team',
          pageTitle: 'Team',
          selectedTeamId: teamId,
          selectedTeam: team,
          teamName: team?.name || '',
          teamGearExpanded: false,
        })
        await this.loadTeamDetailData(teamId)
      } else {
        await this.loadTeamEvents(teamId)
      }
      const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === invite.id)
      if (found) await this.openTeamEventDetail(found)
    }
  },

  async rejectInviteEvent() {
    const invite = (this.data as { inviteConfirmEvent: InviteEvent | null }).inviteConfirmEvent
    if (!invite) return
    await this.api(`/me/events/${invite.id}/reject`, 'POST')
    this.setData({ inviteConfirmEvent: null, editingEvent: null, editTitle: '' })
    await this.loadCalendarEvents()
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    if (invite.teamId && selectedTeamId === invite.teamId) await this.loadTeamEvents(invite.teamId)
  },

  noop() {},

  formatDateTitle(date: string): string {
    const current = dateFromKey(date)
    return `${MONTH_NAMES[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`
  },
})
