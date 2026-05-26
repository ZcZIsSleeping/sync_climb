import { describe, expect, it } from 'vitest';
import {
  calculateMovedRange,
  calendarEventType,
  canJoinTeamEvent,
  shouldShowParticipantInEventDetail
} from '../../src/business.js';

describe('business rules', () => {
  it('moves a single-day event while preserving duration', () => {
    expect(calculateMovedRange('2025-05-01', '2025-05-01', '2025-05-10')).toEqual({
      startDate: '2025-05-10',
      endDate: '2025-05-10'
    });
  });

  it('moves a multi-day event while preserving duration across months', () => {
    expect(calculateMovedRange('2025-05-30', '2025-06-02', '2025-07-10')).toEqual({
      startDate: '2025-07-10',
      endDate: '2025-07-13'
    });
  });

  it('maps calendar event types from scope and participant status', () => {
    expect(calendarEventType('personal')).toBe('personal');
    expect(calendarEventType('team', 'pending')).toBe('pending_team');
    expect(calendarEventType('team', 'joined')).toBe('team');
  });

  it('only shows joined participants in team event detail', () => {
    expect(shouldShowParticipantInEventDetail('joined')).toBe(true);
    expect(shouldShowParticipantInEventDetail('pending')).toBe(false);
    expect(shouldShowParticipantInEventDetail('rejected')).toBe(false);
    expect(shouldShowParticipantInEventDetail('left')).toBe(false);
  });

  it('allows rejected members to join a team event again', () => {
    expect(canJoinTeamEvent(undefined)).toBe(true);
    expect(canJoinTeamEvent('pending')).toBe(true);
    expect(canJoinTeamEvent('rejected')).toBe(true);
    expect(canJoinTeamEvent('left')).toBe(true);
    expect(canJoinTeamEvent('joined')).toBe(false);
  });
});
