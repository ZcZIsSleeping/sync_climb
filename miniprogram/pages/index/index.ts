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

type EventsByDate = Record<string, ClimbEvent[]>

type EventPreview = ClimbEvent & {
  range: string
}

type GearIconOption = {
  label: string
  icon: string
  iconUrl: string
}

type GearItem = {
  id: string
  name: string
  icon: string
  iconUrl: string
  count: number
  displayOrder?: number
  gearTypeId?: string
  userGearId?: string
}

type TeamMember = {
  id: string
  name: string
  avatar: string
  avatarUrl: string
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
  { label: '快挂', icon: 'Q', iconUrl: '/assets/icons/gear/quickdraw.png' },
  { label: '主锁', icon: 'L', iconUrl: '/assets/icons/gear/lock.png' },
  { label: '机械塞', icon: 'C', iconUrl: '/assets/icons/gear/friends.png' },
  { label: '绳索', icon: 'R', iconUrl: '/assets/icons/gear/rope.png' },
  { label: '岩塞', icon: 'N', iconUrl: '/assets/icons/gear/nuts.png' },
  { label: '扁带', icon: 'S', iconUrl: '/assets/icons/gear/sling.png' },
  { label: '帐篷', icon: 'T', iconUrl: '/assets/icons/gear/tent.png' },
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

const API_BASE = 'https://www.synclimb.online'
const COLORS: Array<'blue' | 'pink' | 'green' | 'violet'> = ['blue', 'pink', 'green', 'violet']
const GEAR_TYPE_BY_LABEL: Record<string, string> = {
  快挂: 'gear_quickdraw',
  主锁: 'gear_locking_carabiner',
  机械塞: 'gear_cam',
  绳索: 'gear_rope',
  岩塞: 'gear_nuts',
  扁带: 'gear_sling',
  帐篷: 'gear_tent',
}
const GEAR_TYPE_META: Record<string, GearIconOption> = GEAR_ICON_OPTIONS.reduce((acc, item) => {
  acc[GEAR_TYPE_BY_LABEL[item.label]] = item
  return acc
}, {} as Record<string, GearIconOption>)
const GEAR_ICON_BY_KEY: Record<string, string> = {
  Q: '/assets/icons/gear/quickdraw.png',
  L: '/assets/icons/gear/lock.png',
  C: '/assets/icons/gear/friends.png',
  R: '/assets/icons/gear/rope.png',
  N: '/assets/icons/gear/nuts.png',
  S: '/assets/icons/gear/sling.png',
  T: '/assets/icons/gear/tent.png',
  quickdraw: '/assets/icons/gear/quickdraw.png',
  lock: '/assets/icons/gear/lock.png',
  cam: '/assets/icons/gear/friends.png',
  friends: '/assets/icons/gear/friends.png',
  rope: '/assets/icons/gear/rope.png',
  nuts: '/assets/icons/gear/nuts.png',
  sling: '/assets/icons/gear/sling.png',
  tent: '/assets/icons/gear/tent.png',
}

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

function avatarTextFromNickname(nickname: string): string {
  return (nickname.trim() || 'S').slice(0, 1).toUpperCase()
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

function compareEventsForDisplay(a: ClimbEvent, b: ClimbEvent): number {
  const byDuration = durationDays(b) - durationDays(a)
  if (byDuration !== 0) return byDuration
  return b.createdAt - a.createdAt
}

function buildEventsByDate(events: ClimbEvent[]): EventsByDate {
  const indexed: EventsByDate = {}
  events.forEach((event) => {
    let current = dateFromKey(event.start)
    const end = dateFromKey(event.end)
    while (current <= end) {
      const key = dateKey(current)
      if (!indexed[key]) indexed[key] = []
      indexed[key].push(event)
      current = addDays(current, 1)
    }
  })
  Object.keys(indexed).forEach((key) => indexed[key].sort(compareEventsForDisplay))
  return indexed
}

function sortedEventsForDate(events: ClimbEvent[], date: string): ClimbEvent[] {
  return buildEventsByDate(events)[date] || []
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
  const eventsByDate = buildEventsByDate(events)
  for (let i = 0; i < monthCount; i += 1) {
    months.push(buildMonth(addMonths(anchor, i), eventsByDate, selectingStart, selectingEnd, options))
  }
  return months
}

function buildMonth(
  monthDate: Date,
  eventsByDate: EventsByDate,
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
      const count = inMonth ? (eventsByDate[key] || []).length : 0
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
      segments: buildWeekSegments(weekStartDate, monthStartKey, monthEndKey, eventsByDate, options.maxVisibleEvents),
      moreMarkers: buildWeekMoreMarkers(weekStartDate, monthStartKey, monthEndKey, eventsByDate, options.maxVisibleEvents),
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
  eventsByDate: EventsByDate,
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
    ;(eventsByDate[day] || [])
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
  eventsByDate: EventsByDate,
  maxVisibleEvents: number,
): MoreMarker[] {
  const markers: MoreMarker[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = dateKey(addDays(weekStartDate, i))
    if (day < monthStart || day > monthEnd) continue
    const count = (eventsByDate[day] || []).length
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
    pageSafeStyle: '',
    appShellStyle: '',
    months: [] as CalendarMonth[],
    currentMonthKey: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
    calendarScrollIntoView: '',
    showTodayButton: false,
    weekdays: WEEKDAYS,
    apiBase: API_BASE,
    authToken: '',
    currentUserId: '',
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
    nicknameEditing: false,
    avatarUrl: '',
    avatarText: avatarTextFromNickname('山野同伴'),
    gearIconOptions: GEAR_ICON_OPTIONS,
    gearIconLabels: GEAR_ICON_OPTIONS.map((item) => item.label),
    selectedGearIconIndex: 0,
    selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
    selectedGearIconUrl: GEAR_ICON_OPTIONS[0].iconUrl,
    selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    newGearName: '',
    gearItems: [] as GearItem[],
    gearDragActive: false,
    gearDragId: '',
    gearDragGhostItem: null as GearItem | null,
    gearDragGhostStyle: '',
    basecampScrollEnabled: true,
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
  gearDragSlotRects: [] as Rect[],
  gearDragId: '',
  gearDragTouchOffsetY: 42,
  gearDragGhostLeft: 44,
  gearDragGhostWidth: 0,
  gearQuantityTimers: {} as Record<string, ReturnType<typeof setTimeout>>,
  gearPendingQuantities: {} as Record<string, number>,
  gearSubmittingQuantities: {} as Record<string, boolean>,
  gearSyncFailedIds: {} as Record<string, boolean>,
  gearDragVisualPending: false,
  pendingGearDragGhostStyle: '',
  originalNickname: '山野同伴',
  originalAvatarUrl: '',
  originalTeamName: '',
  eventGearSnapshot: {} as Record<string, number>,
  dragVisualPending: false,
  pendingDragGhostStyle: '',
  pendingDropPreviewStyle: '',
  pendingDropPreviewText: '',
  suppressNextEventTap: false,

  onLoad() {
    this.setupSafeArea()
    this.refreshMonths()
    this.refreshTeamMonths()
    setTimeout(() => this.scrollToTodayMonth(), 80)
  },

  onHide() {
    void this.flushPendingGearQuantities()
  },

  onUnload() {
    void this.flushPendingGearQuantities()
  },

  setupSafeArea() {
    const system = wx.getSystemInfoSync() as { statusBarHeight?: number }
    const topPadding = Math.max(9, (system.statusBarHeight || 0) + 6)
    this.setData({
      pageSafeStyle: `padding-top:${topPadding}px;`,
      appShellStyle: `height:calc(100vh - ${topPadding}px - 18rpx);`,
    })
  },

  api<T>(path: string, method: ApiMethod = 'GET', body?: unknown): Promise<T> {
    const token = (this.data as { authToken: string }).authToken
    return new Promise((resolve, reject) => {
      if (!token && !path.startsWith('/auth/')) {
        this.ensureLogin()
        reject(new Error('login required'))
        return
      }
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

  wxLogin(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code)
            return
          }
          reject(new Error('wx.login missing code'))
        },
        fail: reject,
      })
    })
  },

  uploadAvatar(filePath: string): Promise<string> {
    const token = (this.data as { authToken: string }).authToken
    return new Promise((resolve, reject) => {
      if (!token) {
        reject(new Error('login required'))
        return
      }
      wx.uploadFile({
        url: `${API_BASE}/me/avatar`,
        filePath,
        name: 'avatar',
        header: {
          authorization: `Bearer ${token}`,
        },
        success: (res) => {
          let payload: { avatarUrl?: string; traceId?: string; message?: string } = {}
          try {
            payload = JSON.parse(res.data || '{}')
          } catch (error) {
            reject(error)
            return
          }
          if (res.statusCode >= 200 && res.statusCode < 300 && payload.avatarUrl) {
            resolve(payload.avatarUrl)
            return
          }
          reject(new Error(`avatar upload HTTP ${res.statusCode}: ${payload.message || payload.traceId || res.data}`))
        },
        fail: reject,
      })
    })
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
    const gearTypeId = item.gearTypeId
    const iconKey = item.iconKey || ''
    const meta = gearTypeId ? GEAR_TYPE_META[gearTypeId] : null
    return {
      id: item.id || item.userGearId || item.gearTypeId,
      name: item.name,
      icon: item.icon || meta?.icon || iconKey || 'G',
      iconUrl: item.iconUrl || meta?.iconUrl || GEAR_ICON_BY_KEY[iconKey] || '',
      count: item.count ?? item.quantity ?? 0,
      displayOrder: item.displayOrder,
      gearTypeId,
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
    this.longPressActive = false
    this.resetEventDrag()
    this.setData({
      activeTab: 'basecamp',
      pageTitle: 'BaseCamp',
      scrollEnabled: true,
      expandedDate: '',
      expandedEvents: [],
      createVisible: false,
      editingEvent: null,
      inviteConfirmEvent: null,
      teamEditVisible: false,
      teamEditClosing: false,
      teamGearExpanded: false,
      teamGearClosing: false,
      teamDetailEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
      teamDayPreviewEvents: [],
      selectionPreviewVisible: false,
      dragGhostVisible: false,
      dropPreviewVisible: false,
    })
    this.toast('请先登录')
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
    const startedAt = Date.now()
    const range = apiCalendarRange()
    const res = await this.api<{ events: any[] }>(`/me/calendar/events?start=${range.start}&end=${range.end}`)
    console.info('[perf] loadCalendarEvents', { durationMs: Date.now() - startedAt, count: res.events.length })
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
    await this.loadTeamMembers(teamId)
    await this.loadTeamEvents(teamId)
  },

  async loadTeamMembers(teamId: string) {
    const members = await this.api<{ members: any[] }>(`/teams/${teamId}/members`)
    const teamMembers = members.members.map((item, index) => ({
      id: item.id,
      name: item.id === (this.data as { currentUserId: string }).currentUserId ? '我' : item.name,
      avatar: item.avatar || item.name.slice(0, 1).toUpperCase(),
      avatarUrl: item.avatarUrl || '',
      color: COLORS[index % COLORS.length],
      gear: (item.gear || []).map((gear: any) => this.mapApiGear(gear)),
    }))
    this.setData({ teamMembers, filteredTeamMembers: teamMembers, teamSearchId: '' })
  },

  async loadTeamEvents(teamId: string) {
    const startedAt = Date.now()
    const range = apiCalendarRange()
    const res = await this.api<{ events: any[] }>(
      `/teams/${teamId}/calendar/events?start=${range.start}&end=${range.end}&onlyTeamEvents=${(this.data as { teamOnlyFilter: boolean }).teamOnlyFilter}`,
    )
    const events = res.events.map((item, index) => this.mapApiTeamEvent(item, index))
    console.info('[perf] loadTeamEvents', { durationMs: Date.now() - startedAt, count: events.length, teamId })
    this.setData({ teamEvents: events }, () => this.refreshTeamMonths())
  },

  async refreshAfterTeamStateChanged(changedTeamId?: string) {
    if (!this.ensureLogin()) return
    await Promise.all([
      this.loadTeams(),
      this.loadCalendarEvents(),
    ])

    const data = this.data as {
      selectedTeamId: string
      teams: TeamCard[]
    }
    const selectedTeamId = data.selectedTeamId
    if (!selectedTeamId) return

    const selectedTeam = data.teams.find((item) => item.id === selectedTeamId) || null
    if (!selectedTeam) {
      this.setData({
        selectedTeamId: '',
        selectedTeam: null,
        teamName: '',
        teamMembers: [],
        filteredTeamMembers: [],
        teamEvents: [],
        teamGearExpanded: false,
        teamDetailEvent: null,
        otherEventPreview: null,
        teamDayPreviewDate: '',
        memberGearEditors: [],
        eventGearDirty: false,
      }, () => this.refreshTeamMonths())
      return
    }

    this.setData({
      selectedTeam,
      teamName: selectedTeam.name,
    })
    this.originalTeamName = selectedTeam.name
    if (!changedTeamId || changedTeamId === selectedTeamId) {
      await this.loadTeamEvents(selectedTeamId)
    }
  },

  async switchTab(event: TouchEventLike) {
    const tab = String(event.currentTarget.dataset.tab || 'calendar') as TabKey
    if (tab !== 'basecamp' && !this.ensureLogin()) return
    const current = this.data as { activeTab: TabKey; selectedTeamId: string }
    if (current.activeTab === 'basecamp' && tab !== 'basecamp') {
      await this.flushPendingGearQuantities()
    }
    if (tab === 'team' && current.activeTab === 'team' && current.selectedTeamId) {
      this.backToTeamList()
      return
    }
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
    const startedAt = Date.now()
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
    console.info('[perf] refreshTeamMonths', { durationMs: Date.now() - startedAt, monthCount: data.teamMonthCount, eventCount: events.length })
  },

  refreshMonths() {
    const startedAt = Date.now()
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
    console.info('[perf] refreshMonths', { durationMs: Date.now() - startedAt, monthCount: data.monthCount, eventCount: data.events.length })
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
    if (!this.ensureLogin()) return
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
    this.originalTeamName = team.name
    await this.loadTeamDetailData(id)
    this.scrollToTeamTodayMonth()
  },

  backToTeamList() {
    this.originalTeamName = ''
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
    if (!this.ensureLogin()) return
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

  async exitTeam(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    try {
      await this.api(`/teams/${id}/leave`, 'DELETE')
      await this.refreshAfterTeamStateChanged(id)
    } catch (error) {
      this.toast('退出团队失败')
    }
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
    if (!this.ensureLogin()) return
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
    await this.refreshAfterTeamStateChanged()
    this.closeTeamEditPanel()
  },

  async joinTeam() {
    if (!this.ensureLogin()) return
    const roomCode = (this.data as { joinRoomCode: string }).joinRoomCode.trim()
    if (!roomCode) return
    await this.api('/teams/join', 'POST', { roomCode })
    this.setData({ joinRoomCode: '' })
    await this.refreshAfterTeamStateChanged()
    this.closeTeamEditPanel()
  },

  saveTeamName() {
    if (!this.ensureLogin()) return
    const data = this.data as { selectedTeamId: string; teamName: string; selectedTeam: TeamCard | null; teams: TeamCard[] }
    const name = data.teamName.trim()
    if (!data.selectedTeamId || !name) return
    if (name === this.originalTeamName) return
    this.api(`/teams/${data.selectedTeamId}`, 'PATCH', { name })
      .then(() => {
        this.originalTeamName = name
        this.setData({
          selectedTeam: data.selectedTeam ? { ...data.selectedTeam, name } : null,
          teams: data.teams.map((item) => (item.id === data.selectedTeamId ? { ...item, name } : item)),
        })
      })
      .catch(() => this.toast('团队名保存失败'))
  },

  copyRoomNo() {
    if (!this.ensureLogin()) return
    const team = (this.data as { selectedTeam: TeamCard | null }).selectedTeam
    if (!team) return
    wx.setClipboardData({ data: team.roomNo })
    wx.vibrateShort({ type: 'light' })
  },

  toggleTeamFilter() {
    if (!this.ensureLogin()) return
    const next = !(this.data as { teamOnlyFilter: boolean }).teamOnlyFilter
    const teamId = (this.data as { selectedTeamId: string }).selectedTeamId
    this.setData({ teamOnlyFilter: next }, () => {
      if (teamId) this.loadTeamEvents(teamId)
      else this.refreshTeamMonths()
    })
  },

  async toggleTeamGearPanel() {
    if (!this.ensureLogin()) return
    const data = this.data as { teamGearExpanded: boolean; selectedTeamId: string }
    if (!data.teamGearExpanded) {
      this.setData({ teamGearExpanded: true, teamGearClosing: false })
      if (data.selectedTeamId) {
        try {
          await this.loadTeamMembers(data.selectedTeamId)
        } catch (error) {
          this.toast('团队装备刷新失败')
        }
      }
      return
    }
    this.setData({ teamGearClosing: true })
    setTimeout(() => {
      this.setData({ teamGearExpanded: false, teamGearClosing: false })
    }, 240)
  },

  onTeamSearchInput(event: InputEventLike) {
    if (!this.ensureLogin()) return
    const teamSearchId = event.detail.value
    const members = (this.data as { teamMembers: TeamMember[] }).teamMembers
    const filteredTeamMembers = teamSearchId.trim()
      ? members.filter((item) => item.id.includes(teamSearchId.trim()) || item.name.includes(teamSearchId.trim()))
      : members
    this.setData({ teamSearchId, filteredTeamMembers })
  },

  onDayTouchStart(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    this.touchStartDate = date
    this.touchLastDate = date
  },

  onDayLongPress(event: TouchEventLike) {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
    if (event.currentTarget.dataset.blank) return
    const date = String(event.currentTarget.dataset.date || '')
    this.touchStartDate = date
    this.touchLastDate = date
  },

  onTeamDayLongPress(event: TouchEventLike) {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
    const teamId = explicitTeamId || found.teamId || (this.data as { selectedTeamId: string }).selectedTeamId
    if (!teamId) return
    const detail = await this.api<{
      event: { status?: string; creatorUserId?: string; creatorName?: string }
      gearSummary: any[]
      participants: Array<{ userId: string }>
      requirements: EventGearRequirement[]
    }>(`/teams/${teamId}/events/${found.id}`)
    const eventWithGear = {
      ...found,
      teamId,
      status: detail.event.status || found.status,
      creatorUserId: detail.event.creatorUserId || found.creatorUserId,
      creator: detail.event.creatorName || found.creator,
      gearSummary: (detail.gearSummary || []).map((item) => this.mapApiGear({ ...item, id: item.gearTypeId, count: item.quantity })),
    }
    const memberGearEditors = this.buildMemberGearEditors(
      eventWithGear,
      detail.participants.map((item) => item.userId),
      detail.requirements || [],
    )
    this.eventGearSnapshot = this.snapshotEventGearRequirements(memberGearEditors)
    this.setData({
      teamDetailEvent: eventWithGear,
      memberGearEditors,
      eventGearDirty: false,
    })
  },

  openInviteConfirm(found: ClimbEvent | TeamCalendarEvent, scope: 'calendar' | 'team') {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
      avatarUrl: item.avatarUrl || '',
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
      await this.refreshAfterTeamStateChanged(selectedTeamId)
    }
  },

  onTeamMoreTap(event: TouchEventLike) {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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

  async login() {
    try {
      const code = await this.wxLogin()
      const res = await this.api<{ token: string; user: { id: string; nickname: string; avatarUrl: string } }>('/auth/wechat-login', 'POST', {
        code,
        nickname: '攀登者',
        avatarUrl: '',
      })
      this.setData({
        loggedIn: true,
        authToken: res.token,
        currentUserId: res.user.id,
        nickname: res.user.nickname,
        avatarUrl: res.user.avatarUrl || '',
        avatarText: avatarTextFromNickname(res.user.nickname),
      })
      this.originalNickname = res.user.nickname
      this.originalAvatarUrl = res.user.avatarUrl || ''
      await this.loadAppData()
      this.toast(`已登录 ${res.user.nickname}`)
    } catch (error) {
      this.toast('微信登录失败')
    }
  },

  async logout() {
    await this.flushPendingGearQuantities()
    this.clearGearQuantityState()
    this.originalNickname = '山野同伴'
    this.originalAvatarUrl = ''
    this.originalTeamName = ''
    this.eventGearSnapshot = {}
    this.setData({
      loggedIn: false,
      authToken: '',
      currentUserId: '',
      nickname: '山野同伴',
      nicknameEditing: false,
      avatarUrl: '',
      avatarText: avatarTextFromNickname('山野同伴'),
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
    this.setData({
      nickname: event.detail.value,
      avatarText: avatarTextFromNickname(event.detail.value),
    })
  },

  startNicknameEdit() {
    if (!this.ensureLogin()) return
    this.setData({ nicknameEditing: true })
  },

  onAvatarError(event?: unknown) {
    console.warn('[avatar load failed]', {
      avatarUrl: (this.data as { avatarUrl: string }).avatarUrl,
      event,
    })
  },

  async onChooseAvatar(event: { detail: { avatarUrl?: string } }) {
    if (!this.ensureLogin()) return
    const avatarUrl = event.detail.avatarUrl || ''
    if (!avatarUrl) return
    this.setData({ avatarUrl })
    try {
      const storedAvatarUrl = await this.uploadAvatar(avatarUrl)
      this.setData({ avatarUrl: storedAvatarUrl })
      this.originalAvatarUrl = storedAvatarUrl
      this.toast('头像已保存')
    } catch (error) {
      console.error('[avatar save failed]', {
        avatarUrl,
        error,
      })
      this.toast('头像已选择，保存失败')
    }
  },

  async saveNickname() {
    if (!this.ensureLogin()) return
    await this.saveProfile('昵称已保存', true)
  },

  async saveProfile(successTitle?: string, endNicknameEdit = false) {
    if (!this.ensureLogin()) return
    const data = this.data as { nickname: string; avatarUrl: string }
    const nickname = data.nickname.trim()
    if (!nickname) {
      if (endNicknameEdit) this.setData({ nicknameEditing: false })
      return
    }
    if (nickname === this.originalNickname && (data.avatarUrl || '') === this.originalAvatarUrl) {
      if (endNicknameEdit) this.setData({ nicknameEditing: false })
      return
    }
    const res = await this.api<{ user: { nickname: string; avatarUrl: string } }>('/me/profile', 'PATCH', {
      nickname,
      avatarUrl: data.avatarUrl || '',
    })
    this.originalNickname = res.user.nickname
    this.originalAvatarUrl = res.user.avatarUrl || data.avatarUrl || ''
    this.setData({
      nickname: res.user.nickname,
      avatarUrl: res.user.avatarUrl || data.avatarUrl || '',
      avatarText: avatarTextFromNickname(res.user.nickname),
      ...(endNicknameEdit ? { nicknameEditing: false } : {}),
    })
    if (successTitle) this.toast(successTitle)
  },

  onGearIconChange(event: PickerEventLike) {
    if (!this.ensureLogin()) return
    const index = Number(event.detail.value)
    const option = GEAR_ICON_OPTIONS[index] || GEAR_ICON_OPTIONS[0]
    this.setData({
      selectedGearIconIndex: index,
      selectedGearIcon: option.icon,
      selectedGearIconUrl: option.iconUrl,
      selectedGearIconLabel: option.label,
    })
  },

  onGearNameInput(event: InputEventLike) {
    if (!this.ensureLogin()) return
    this.setData({ newGearName: event.detail.value })
  },

  clearGearQuantityState() {
    Object.values(this.gearQuantityTimers).forEach((timer) => clearTimeout(timer))
    this.gearQuantityTimers = {}
    this.gearPendingQuantities = {}
    this.gearSubmittingQuantities = {}
    this.gearSyncFailedIds = {}
  },

  scheduleGearQuantitySave(id: string, quantity: number) {
    this.gearPendingQuantities[id] = quantity
    this.gearSyncFailedIds[id] = false
    if (this.gearQuantityTimers[id]) clearTimeout(this.gearQuantityTimers[id])
    this.gearQuantityTimers[id] = setTimeout(() => {
      delete this.gearQuantityTimers[id]
      void this.submitGearQuantity(id)
    }, 700)
  },

  async submitGearQuantity(id: string) {
    if (this.gearSubmittingQuantities[id]) return
    const quantity = this.gearPendingQuantities[id]
    if (quantity === undefined) return
    this.gearSubmittingQuantities[id] = true
    try {
      await this.api(`/me/gears/${id}`, 'PATCH', { quantity })
      if (this.gearPendingQuantities[id] === quantity) {
        delete this.gearPendingQuantities[id]
      }
      this.gearSyncFailedIds[id] = false
    } catch (error) {
      this.gearSyncFailedIds[id] = true
      console.warn('[gear quantity sync failed]', { id, quantity, error })
    } finally {
      this.gearSubmittingQuantities[id] = false
      if (this.gearPendingQuantities[id] !== undefined && this.gearPendingQuantities[id] !== quantity) {
        void this.submitGearQuantity(id)
      }
    }
  },

  async flushPendingGearQuantities() {
    const pendingIds = Object.keys(this.gearPendingQuantities)
    if (!pendingIds.length) return
    const start = Date.now()
    pendingIds.forEach((id) => {
      if (this.gearQuantityTimers[id]) {
        clearTimeout(this.gearQuantityTimers[id])
        delete this.gearQuantityTimers[id]
      }
    })
    await Promise.all(pendingIds.map((id) => this.submitGearQuantity(id)))
    console.info('[perf] flushPendingGearQuantities', {
      count: pendingIds.length,
      durationMs: Date.now() - start,
      failed: Object.values(this.gearSyncFailedIds).filter(Boolean).length,
    })
  },

  cancelPendingGearQuantity(id: string) {
    if (this.gearQuantityTimers[id]) {
      clearTimeout(this.gearQuantityTimers[id])
      delete this.gearQuantityTimers[id]
    }
    delete this.gearPendingQuantities[id]
    delete this.gearSubmittingQuantities[id]
    delete this.gearSyncFailedIds[id]
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

  eventGearRequirementKey(participantUserId: string, userGearId: string): string {
    return `${participantUserId}::${userGearId}`
  },

  snapshotEventGearRequirements(editors: MemberGearEditor[]): Record<string, number> {
    const snapshot: Record<string, number> = {}
    editors.forEach((editor) => {
      editor.allocations.forEach((gear) => {
        snapshot[this.eventGearRequirementKey(editor.member.id, gear.userGearId || gear.id)] = gear.count
      })
    })
    return snapshot
  },

  closeOtherEventPreview() {
    this.setData({ otherEventPreview: null })
  },

  async closeTeamEventDetail() {
    if (!this.ensureLogin()) return
    await this.submitEventGearIfDirty()
    this.setData({ teamEventClosing: true })
    setTimeout(() => {
      this.eventGearSnapshot = {}
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
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    const editors = ((this.data as { memberGearEditors: MemberGearEditor[] }).memberGearEditors).map((item) => {
      if (item.member.id !== id) return item
      return { ...item, expanded: !item.expanded }
    })
    this.setData({ memberGearEditors: editors })
  },

  changeEventGear(event: TouchEventLike, delta: number) {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
      editor.allocations
        .filter((gear) => {
          const key = this.eventGearRequirementKey(editor.member.id, gear.userGearId || gear.id)
          return (this.eventGearSnapshot[key] || 0) !== gear.count
        })
        .map((gear) => ({
          participantUserId: editor.member.id,
          gearTypeId: gear.gearTypeId || gear.id,
          userGearId: gear.userGearId || gear.id,
          quantity: gear.count,
        }))
    ))
    if (!requirements.length) {
      this.setData({ eventGearDirty: false })
      return
    }
    try {
      const res = await this.api<{ gearSummary?: any[] }>(`/teams/${teamId}/events/${data.teamDetailEvent.id}/gear-requirements`, 'PATCH', { requirements })
      const gearSummary = (res.gearSummary || []).map((item) => this.mapApiGear({ ...item, id: item.gearTypeId, count: item.quantity }))
      const updatedEvent = { ...data.teamDetailEvent, gearSummary }
      const teamEvents = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).map((item) => (
        item.id === updatedEvent.id ? updatedEvent : item
      ))
      this.eventGearSnapshot = this.snapshotEventGearRequirements(data.memberGearEditors)
      this.setData({ eventGearDirty: false, teamDetailEvent: updatedEvent, teamEvents })
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
          iconUrl: meta?.iconUrl || gear.iconUrl,
          count: gear.count,
          gearTypeId,
        })
      })
    })
    return Array.from(merged.values())
  },

  onGearSummaryLongPress(event: TouchEventLike) {
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
    const data = this.data as { teamDetailEvent: TeamCalendarEvent | null; teamEvents: TeamCalendarEvent[] }
    if (!data.teamDetailEvent) return
    wx.vibrateShort({ type: 'light' })
    const teamId = data.teamDetailEvent.teamId || (this.data as { selectedTeamId: string }).selectedTeamId
    if (teamId) await this.api(`/teams/${teamId}/events/${data.teamDetailEvent.id}`, 'DELETE')
    this.setData({
      teamDetailEvent: null,
      memberGearEditors: [],
      eventGearDirty: false,
    })
    await this.refreshAfterTeamStateChanged(teamId)
  },

  async joinTeamDetailEvent() {
    if (!this.ensureLogin()) return
    const data = this.data as {
      teamDetailEvent: TeamCalendarEvent | null
      teamEvents: TeamCalendarEvent[]
      selectedTeamId: string
    }
    if (!data.teamDetailEvent) return
    const teamId = data.teamDetailEvent.teamId || data.selectedTeamId
    if (!teamId) return
    wx.vibrateShort({ type: 'light' })
    await this.api(`/teams/${teamId}/events/${data.teamDetailEvent.id}/join`, 'POST')
    const joinedEvent = { ...data.teamDetailEvent, status: 'joined' }
    this.setData({
      teamDetailEvent: joinedEvent,
      teamEvents: data.teamEvents.map((item) => (item.id === joinedEvent.id ? { ...item, status: 'joined' } : item)),
    })
    await this.refreshAfterTeamStateChanged(teamId)
    await this.openTeamEventDetail(joinedEvent, teamId)
  },

  async leaveTeamDetailEvent() {
    if (!this.ensureLogin()) return
    const data = this.data as {
      teamDetailEvent: TeamCalendarEvent | null
      teamEvents: TeamCalendarEvent[]
      selectedTeamId: string
    }
    if (!data.teamDetailEvent) return
    const teamId = data.teamDetailEvent.teamId || data.selectedTeamId
    if (!teamId) return
    wx.vibrateShort({ type: 'light' })
    await this.api(`/teams/${teamId}/events/${data.teamDetailEvent.id}/leave`, 'POST')
    const leftEvent = { ...data.teamDetailEvent, status: 'left', gearSummary: [] }
    this.setData({
      teamDetailEvent: null,
      memberGearEditors: [],
      eventGearDirty: false,
      teamEvents: data.teamEvents.map((item) => (item.id === leftEvent.id ? { ...item, status: 'left' } : item)),
    })
    await this.refreshAfterTeamStateChanged(teamId)
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
    const next = this.mapApiGear({ ...res.gear, icon: option.icon, iconUrl: option.iconUrl, count: res.gear.quantity })
    this.setData({
      gearItems: [next, ...data.gearItems],
      newGearName: '',
      selectedGearIconIndex: 0,
      selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
      selectedGearIconUrl: GEAR_ICON_OPTIONS[0].iconUrl,
      selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    })
  },

  onGearLongPress(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    const gearItems = (this.data as { gearItems: GearItem[] }).gearItems
    const item = gearItems.find((gear) => gear.id === id)
    const touch = event.touches[0] || event.changedTouches?.[0]
    if (!item || !touch) return
    wx.vibrateShort({ type: 'light' })
    this.gearDragId = id
    wx.createSelectorQuery()
      .select(`#gear-slot-${id}`)
      .boundingClientRect((rect) => {
        if (!rect) return
        this.gearDragTouchOffsetY = Math.max(0, touch.clientY - rect.top)
        this.gearDragGhostLeft = rect.left
        this.gearDragGhostWidth = rect.width
        this.cacheGearDragSlotRects()
        this.setData({
          gearDragActive: true,
          gearDragId: id,
          gearDragGhostItem: item,
          gearDragGhostStyle: this.gearDragGhostStyle(touch.clientY),
          basecampScrollEnabled: false,
        })
      })
      .exec()
  },

  onGearTouchMove(event: TouchEventLike) {
    if (!this.gearDragId) return
    const touch = event.touches[0]
    if (!touch) return
    this.queueGearDragVisual(touch.clientY)
    const targetIndex = this.gearDragTargetIndex(touch.clientY)
    if (targetIndex < 0) return
    const gearItems = [...(this.data as { gearItems: GearItem[] }).gearItems]
    const currentIndex = gearItems.findIndex((item) => item.id === this.gearDragId)
    if (currentIndex < 0 || currentIndex === targetIndex) return
    const [dragged] = gearItems.splice(currentIndex, 1)
    gearItems.splice(targetIndex, 0, dragged)
    this.setData({ gearItems })
  },

  queueGearDragVisual(y: number) {
    this.pendingGearDragGhostStyle = this.gearDragGhostStyle(y)
    if (this.gearDragVisualPending) return
    this.gearDragVisualPending = true
    setTimeout(() => {
      this.gearDragVisualPending = false
      this.setData({ gearDragGhostStyle: this.pendingGearDragGhostStyle })
    }, 16)
  },

  async onGearTouchEnd() {
    if (!this.gearDragId) return
    const gearItems = (this.data as { gearItems: GearItem[] }).gearItems
    this.gearDragId = ''
    this.gearDragSlotRects = []
    this.gearDragTouchOffsetY = 42
    this.gearDragGhostLeft = 44
    this.gearDragGhostWidth = 0
    this.gearDragVisualPending = false
    this.pendingGearDragGhostStyle = ''
    this.setData({
      gearDragActive: false,
      gearDragId: '',
      gearDragGhostItem: null,
      gearDragGhostStyle: '',
      basecampScrollEnabled: true,
    })
    try {
      await this.api('/me/gears/order', 'PATCH', { gearIds: gearItems.map((item) => item.id) })
    } catch (error) {
      this.toast('装备排序保存失败')
      await this.loadGearItems()
    }
  },

  cacheGearDragSlotRects() {
    wx.createSelectorQuery()
      .selectAll('.gear-card')
      .boundingClientRect((rects) => {
        this.gearDragSlotRects = rects
          .filter((rect) => rect.id)
          .sort((a, b) => a.top - b.top)
      })
      .exec()
  },

  gearDragTargetIndex(y: number): number {
    if (!this.gearDragSlotRects.length) return -1
    const matchIndex = this.gearDragSlotRects.findIndex((rect) => y < rect.top + rect.height / 2)
    return matchIndex >= 0 ? matchIndex : this.gearDragSlotRects.length - 1
  },

  gearDragGhostStyle(y: number): string {
    const top = Math.max(12, y - this.gearDragTouchOffsetY)
    const width = this.gearDragGhostWidth ? `width:${this.gearDragGhostWidth}px;` : 'right:44rpx;'
    return `left:${this.gearDragGhostLeft}px;top:${top}px;${width}`
  },

  async decreaseGear(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const current = ((this.data as { gearItems: GearItem[] }).gearItems).find((item) => item.id === id)
    if (!current) return
    const nextCount = Math.max(0, current.count - 1)
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: nextCount }
    })
    this.setData({ gearItems })
    this.scheduleGearQuantitySave(id, nextCount)
  },

  async increaseGear(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const current = ((this.data as { gearItems: GearItem[] }).gearItems).find((item) => item.id === id)
    if (!current) return
    const nextCount = current.count + 1
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: nextCount }
    })
    this.setData({ gearItems })
    this.scheduleGearQuantitySave(id, nextCount)
  },

  async deleteGear(event: TouchEventLike) {
    if (!this.ensureLogin()) return
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    this.cancelPendingGearQuantity(id)
    const currentItems = (this.data as { gearItems: GearItem[] }).gearItems
    const removed = currentItems.find((item) => item.id === id)
    const gearItems = currentItems.filter((item) => item.id !== id)
    this.setData({ gearItems })
    try {
      await this.api(`/me/gears/${id}`, 'DELETE')
    } catch (error) {
      if (removed) this.setData({ gearItems: currentItems })
      this.toast('装备删除失败')
    }
  },

  async saveCreatedEvent() {
    if (!this.ensureLogin()) return
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
      await this.refreshAfterTeamStateChanged(selectedTeamId)
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
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
    if (!this.ensureLogin()) return
    const invite = (this.data as { inviteConfirmEvent: InviteEvent | null }).inviteConfirmEvent
    if (!invite) return
    await this.api(`/me/events/${invite.id}/accept`, 'POST')
    this.setData({ inviteConfirmEvent: null, editingEvent: null, editTitle: '' })
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    const teamId = invite.teamId || selectedTeamId
    if (teamId) {
      if (selectedTeamId !== teamId) {
        await this.refreshAfterTeamStateChanged(teamId)
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
        await this.refreshAfterTeamStateChanged(teamId)
      }
      const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === invite.id)
      if (found) await this.openTeamEventDetail(found)
    } else {
      await this.refreshAfterTeamStateChanged()
    }
  },

  async rejectInviteEvent() {
    if (!this.ensureLogin()) return
    const invite = (this.data as { inviteConfirmEvent: InviteEvent | null }).inviteConfirmEvent
    if (!invite) return
    await this.api(`/me/events/${invite.id}/reject`, 'POST')
    this.setData({ inviteConfirmEvent: null, editingEvent: null, editTitle: '' })
    await this.refreshAfterTeamStateChanged(invite.teamId)
  },

  noop() {},

  formatDateTitle(date: string): string {
    const current = dateFromKey(date)
    return `${MONTH_NAMES[current.getMonth()]} ${current.getDate()}, ${current.getFullYear()}`
  },
})
