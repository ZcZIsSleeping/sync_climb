export type ParticipantStatus = 'pending' | 'joined' | 'rejected' | 'left';
export type EventScope = 'personal' | 'team';
export type CalendarEventType = 'personal' | 'pending_team' | 'team';

const dayMs = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`invalid date: ${value}`);
  return date;
}

function formatDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function calculateMovedRange(startDate: string, endDate: string, nextStartDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const nextStart = parseDateOnly(nextStartDate);
  const durationDays = Math.round((end.getTime() - start.getTime()) / dayMs);
  const nextEnd = new Date(nextStart.getTime() + durationDays * dayMs);

  return {
    startDate: formatDateOnly(nextStart),
    endDate: formatDateOnly(nextEnd)
  };
}

export function calendarEventType(scope: EventScope, status?: ParticipantStatus): CalendarEventType {
  if (scope === 'personal') return 'personal';
  return status === 'pending' ? 'pending_team' : 'team';
}

export function shouldShowParticipantInEventDetail(status: ParticipantStatus) {
  return status === 'joined';
}

export function canJoinTeamEvent(status?: ParticipantStatus) {
  return status === undefined || status === 'pending' || status === 'rejected' || status === 'left';
}
