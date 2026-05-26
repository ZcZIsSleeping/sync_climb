type TouchEventLike = {
  currentTarget: { dataset: Record<string, string | boolean | number | undefined> }
  touches: Array<{ clientX: number; clientY: number }>
}

type InputEventLike = {
  detail: { value: string }
}

type PickerEventLike = {
  detail: { value: string | number }
}

type TabKey = 'calendar' | 'team' | 'basecamp'

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
  isTeamEvent: boolean
  gearSummary: GearItem[]
}

type MemberGearEditor = {
  member: TeamMember
  expanded: boolean
  allocations: GearItem[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const GEAR_ICON_OPTIONS: GearIconOption[] = [
  { label: '快挂', icon: 'Q' },
  { label: '主锁', icon: 'L' },
  { label: '机械塞', icon: 'C' },
  { label: '绳索', icon: 'R' },
]
const seedTeams: TeamCard[] = [
  { id: 'team-everest', avatar: 'E', name: '珠峰大本营小队', roomNo: '8848', memberCount: 4, pinned: true },
  { id: 'team-siguniang', avatar: 'S', name: '四姑娘山周末队', roomNo: '6250', memberCount: 6, pinned: false },
  { id: 'team-rock', avatar: 'R', name: '城市岩壁训练组', roomNo: '4096', memberCount: 3, pinned: false },
]
const seedMembers: TeamMember[] = [
  {
    id: 'me',
    name: '我',
    avatar: 'S',
    color: 'blue',
    gear: [
      { id: 'me-quickdraw', name: '快挂', icon: 'Q', count: 8 },
      { id: 'me-locker', name: '主锁', icon: 'L', count: 4 },
      { id: 'me-rope', name: '绳索', icon: 'R', count: 1 },
    ],
  },
  {
    id: 'lin',
    name: '林晨',
    avatar: 'L',
    color: 'pink',
    gear: [
      { id: 'lin-cam', name: '机械塞', icon: 'C', count: 6 },
      { id: 'lin-locker', name: '主锁', icon: 'L', count: 3 },
      { id: 'lin-rope', name: '绳索', icon: 'R', count: 1 },
    ],
  },
  {
    id: 'zhou',
    name: '周野',
    avatar: 'Z',
    color: 'green',
    gear: [
      { id: 'zhou-quickdraw', name: '快挂', icon: 'Q', count: 10 },
      { id: 'zhou-locker', name: '主锁', icon: 'L', count: 5 },
    ],
  },
  {
    id: 'alan',
    name: '阿岚',
    avatar: 'A',
    color: 'violet',
    gear: [
      { id: 'alan-cam', name: '机械塞', icon: 'C', count: 8 },
      { id: 'alan-quickdraw', name: '快挂', icon: 'Q', count: 6 },
    ],
  },
]
const seedTeamEvents: TeamCalendarEvent[] = [
  {
    id: 'TEVT-001',
    title: '高海拔装备测试',
    creator: '林晨',
    memberId: 'lin',
    start: '2025-05-06',
    end: '2025-05-09',
    createdAt: 1713300000000,
    color: 'pink',
    isTeamEvent: false,
    gearSummary: [],
  },
  {
    id: 'TEVT-002',
    title: '绳索系统复训',
    creator: '周野',
    memberId: 'zhou',
    start: '2025-05-08',
    end: '2025-05-12',
    createdAt: 1713400000000,
    color: 'blue',
    isTeamEvent: false,
    gearSummary: [],
  },
  {
    id: 'TEVT-003',
    title: '天气窗口讨论',
    creator: '阿岚',
    memberId: 'alan',
    start: '2025-05-16',
    end: '2025-05-16',
    createdAt: 1713500000000,
    color: 'pink',
    isTeamEvent: false,
    gearSummary: [],
  },
  {
    id: 'TEVT-TEAM-001',
    title: '珠峰营地协同计划',
    creator: '我',
    memberId: 'me',
    start: '2025-05-20',
    end: '2025-05-23',
    createdAt: 1713600000000,
    color: 'blue',
    isTeamEvent: true,
    gearSummary: [
      { id: 'event-quickdraw', name: '快挂', icon: 'Q', count: 4 },
      { id: 'event-locker', name: '主锁', icon: 'L', count: 2 },
    ],
  },
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
  options: BuildMonthOptions = { maxVisibleEvents: 2 },
): CalendarMonth[] {
  const anchor = new Date(2025, 3, 1)
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
      color: `event-segment--${current.event.color}`,
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
    weekdays: WEEKDAYS,
    events: seedEvents as ClimbEvent[],
    monthCount: 4,
    scrollEnabled: true,
    selectingStart: '',
    selectingEnd: '',
    createVisible: false,
    createTarget: 'calendar',
    createRangeText: '',
    createTitle: '',
    expandedDate: '',
    expandedTitle: '',
    expandedEvents: [] as EventPreview[],
    expandedPanelStyle: '',
    editingEvent: null as EventPreview | null,
    editTitle: '',
    loggedIn: false,
    nickname: '山野同伴',
    gearIconOptions: GEAR_ICON_OPTIONS,
    gearIconLabels: GEAR_ICON_OPTIONS.map((item) => item.label),
    selectedGearIconIndex: 0,
    selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
    selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    newGearName: '',
    gearItems: [
      { id: 'gear-quickdraw', name: '快挂', icon: 'Q', count: 8 },
      { id: 'gear-locker', name: '主锁', icon: 'L', count: 4 },
      { id: 'gear-rope', name: '绳索', icon: 'R', count: 1 },
    ] as GearItem[],
    teams: seedTeams as TeamCard[],
    selectedTeamId: '',
    selectedTeam: null as TeamCard | null,
    teamName: '',
    teamMembers: seedMembers as TeamMember[],
    filteredTeamMembers: seedMembers as TeamMember[],
    teamSearchId: '',
    teamGearExpanded: false,
    teamGearClosing: false,
    teamOnlyFilter: false,
    teamEvents: seedTeamEvents as TeamCalendarEvent[],
    teamMonths: [] as CalendarMonth[],
    teamMonthCount: 4,
    teamSelectingStart: '',
    teamSelectingEnd: '',
    teamEventClosing: false,
    teamDetailEvent: null as TeamCalendarEvent | null,
    otherEventPreview: null as TeamCalendarEvent | null,
    teamDayPreviewDate: '',
    teamDayPreviewTitle: '',
    teamDayPreviewEvents: [] as TeamCalendarEvent[],
    memberGearEditors: [] as MemberGearEditor[],
  },

  longPressActive: false,
  touchStartDate: '',
  touchLastDate: '',

  onLoad() {
    this.refreshMonths()
    this.refreshTeamMonths()
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
    })
  },

  refreshTeamMonths() {
    const data = this.data as {
      teamEvents: TeamCalendarEvent[]
      teamMonthCount: number
      teamSelectingStart: string
      teamSelectingEnd: string
      teamOnlyFilter: boolean
    }
    const events = data.teamOnlyFilter ? data.teamEvents.filter((item) => item.isTeamEvent) : data.teamEvents
    this.setData({
      teamMonths: buildMonths(events, data.teamMonthCount, data.teamSelectingStart, data.teamSelectingEnd, { maxVisibleEvents: 3 }),
    })
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

  onTeamScrollToLower() {
    const data = this.data as { teamMonthCount: number }
    this.setData({ teamMonthCount: data.teamMonthCount + 3 }, () => this.refreshTeamMonths())
  },

  enterTeam(event: TouchEventLike) {
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
    }, () => this.refreshTeamMonths())
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
    const teams = ((this.data as { teams: TeamCard[] }).teams).filter((item) => item.id !== id)
    this.setData({ teams })
  },

  onTeamNameInput(event: InputEventLike) {
    const teamName = event.detail.value
    const selectedTeamId = (this.data as { selectedTeamId: string }).selectedTeamId
    const teams = ((this.data as { teams: TeamCard[] }).teams).map((item) => (
      item.id === selectedTeamId ? { ...item, name: teamName } : item
    ))
    this.setData({ teamName, teams })
  },

  copyRoomNo() {
    const team = (this.data as { selectedTeam: TeamCard | null }).selectedTeam
    if (!team) return
    wx.setClipboardData({ data: team.roomNo })
    wx.vibrateShort({ type: 'light' })
  },

  toggleTeamFilter() {
    const next = !(this.data as { teamOnlyFilter: boolean }).teamOnlyFilter
    this.setData({ teamOnlyFilter: next }, () => this.refreshTeamMonths())
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
      createTarget: 'calendar',
      createRangeText: rangeText(start, end),
      createTitle: '',
    }, () => this.refreshMonths())
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
    this.setData({
      scrollEnabled: false,
      teamSelectingStart: date,
      teamSelectingEnd: date,
      teamDetailEvent: null,
      otherEventPreview: null,
      teamDayPreviewDate: '',
    }, () => this.refreshTeamMonths())
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
    this.setData({
      scrollEnabled: true,
      teamSelectingStart: start,
      teamSelectingEnd: end,
      createVisible: true,
      createTarget: 'team',
      createRangeText: rangeText(start, end),
      createTitle: '',
    }, () => this.refreshTeamMonths())
  },

  updateTeamSelectionFromPoint(x: number, y: number) {
    wx.createSelectorQuery()
      .selectAll('.team-day-cell')
      .boundingClientRect((rects) => {
        const match = rects.find((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
        if (!match || !match.id) return
        const date = match.id.replace(/^td/, '')
        if (date === this.touchLastDate) return
        this.touchLastDate = date
        this.setData({ teamSelectingEnd: date }, () => this.refreshTeamMonths())
      })
      .exec()
  },

  onTeamEventTap(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { teamEvents: TeamCalendarEvent[] }).teamEvents).find((item) => item.id === id)
    if (!found) return
    if (!found.isTeamEvent) {
      this.setData({ otherEventPreview: found })
      return
    }
    this.setData({
      teamDetailEvent: found,
      memberGearEditors: this.buildMemberGearEditors(found),
    })
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
    this.setData({
      teamDetailEvent: found,
      memberGearEditors: this.buildMemberGearEditors(found),
    })
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

  onCalendarEventTap(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    const found = ((this.data as { events: ClimbEvent[] }).events).find((item) => item.id === id)
    if (!found) return
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

  login() {
    this.setData({ loggedIn: true })
  },

  onNicknameInput(event: InputEventLike) {
    this.setData({ nickname: event.detail.value })
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

  buildMemberGearEditors(event: TeamCalendarEvent): MemberGearEditor[] {
    const members = (this.data as { teamMembers: TeamMember[] }).teamMembers
    return members.map((member) => ({
      member,
      expanded: false,
      allocations: member.gear.map((gear) => {
        const current = event.gearSummary.find((item) => item.name === gear.name)
        return {
          ...gear,
          count: current ? Math.min(current.count, gear.count) : 0,
        }
      }),
    }))
  },

  closeOtherEventPreview() {
    this.setData({ otherEventPreview: null })
  },

  closeTeamEventDetail() {
    this.setData({ teamEventClosing: true })
    setTimeout(() => {
      this.setData({ teamDetailEvent: null, memberGearEditors: [], teamEventClosing: false })
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
    }
    if (!data.teamDetailEvent) return
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
    })
  },

  decreaseEventGear(event: TouchEventLike) {
    this.changeEventGear(event, -1)
  },

  increaseEventGear(event: TouchEventLike) {
    this.changeEventGear(event, 1)
  },

  mergeEventGear(editors: MemberGearEditor[]): GearItem[] {
    const merged = new Map<string, GearItem>()
    editors.forEach((editor) => {
      editor.allocations.forEach((gear) => {
        if (gear.count <= 0) return
        const current = merged.get(gear.name)
        if (current) {
          merged.set(gear.name, { ...current, count: current.count + gear.count })
          return
        }
        merged.set(gear.name, { id: `summary-${gear.name}`, name: gear.name, icon: gear.icon, count: gear.count })
      })
    })
    return Array.from(merged.values())
  },

  deleteTeamEvent() {
    const data = this.data as { teamDetailEvent: TeamCalendarEvent | null; teamEvents: TeamCalendarEvent[] }
    if (!data.teamDetailEvent) return
    wx.vibrateShort({ type: 'light' })
    const teamEvents = data.teamEvents.filter((item) => item.id !== data.teamDetailEvent!.id)
    this.setData({
      teamEvents,
      teamDetailEvent: null,
      memberGearEditors: [],
    }, () => this.refreshTeamMonths())
  },

  addGear() {
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
    const next: GearItem = {
      id: `gear-${Date.now()}`,
      name,
      icon: option.icon,
      count: 1,
    }
    this.setData({
      gearItems: [next, ...data.gearItems],
      newGearName: '',
      selectedGearIconIndex: 0,
      selectedGearIcon: GEAR_ICON_OPTIONS[0].icon,
      selectedGearIconLabel: GEAR_ICON_OPTIONS[0].label,
    })
  },

  decreaseGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: Math.max(0, item.count - 1) }
    })
    this.setData({ gearItems })
  },

  increaseGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).map((item) => {
      if (item.id !== id) return item
      return { ...item, count: item.count + 1 }
    })
    this.setData({ gearItems })
  },

  deleteGear(event: TouchEventLike) {
    const id = String(event.currentTarget.dataset.id || '')
    wx.vibrateShort({ type: 'light' })
    const gearItems = ((this.data as { gearItems: GearItem[] }).gearItems).filter((item) => item.id !== id)
    this.setData({ gearItems })
  },

  saveCreatedEvent() {
    const data = this.data as {
      events: ClimbEvent[]
      teamEvents: TeamCalendarEvent[]
      selectingStart: string
      selectingEnd: string
      teamSelectingStart: string
      teamSelectingEnd: string
      createTitle: string
      createTarget: string
    }
    const title = data.createTitle.trim()
    if (!title) return
    if (data.createTarget === 'team') {
      const start = data.teamSelectingStart < data.teamSelectingEnd ? data.teamSelectingStart : data.teamSelectingEnd
      const end = data.teamSelectingStart < data.teamSelectingEnd ? data.teamSelectingEnd : data.teamSelectingStart
      const next: TeamCalendarEvent = {
        id: `TEVT-${Date.now()}`,
        title,
        creator: '我',
        memberId: 'me',
        start,
        end,
        createdAt: Date.now(),
        color: 'blue',
        isTeamEvent: true,
        gearSummary: [],
      }
      this.setData({
        teamEvents: [...data.teamEvents, next],
        createVisible: false,
        createTitle: '',
        teamSelectingStart: '',
        teamSelectingEnd: '',
      }, () => this.refreshTeamMonths())
      return
    }
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
      teamSelectingStart: '',
      teamSelectingEnd: '',
    }, () => {
      this.refreshMonths()
      this.refreshTeamMonths()
    })
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
