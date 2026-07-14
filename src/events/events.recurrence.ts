import { EventFrequency, RecurrenceFrequency } from '../shared/domain';

/**
 * Maximum number of candidate dates a single expansion will ever return. Acts as
 * a safety net against unbounded queries / misconfigured rules. When the cap is
 * hit, expansion stops early and the caller should narrow the requested window.
 */
export const MAX_EXPANDED_OCCURRENCES = 366;

export interface RecurrenceRule {
  freq: RecurrenceFrequency;
  interval: number;
  /** Weekdays (0 = Sunday … 6 = Saturday, UTC) for weekly rules; null otherwise. */
  byDay: number[] | null;
  /** Inclusive series end; null means open-ended (still bounded by the window). */
  until: Date | null;
}

export interface ExpandableEvent {
  frequency: EventFrequency;
  startDate: Date;
  recurrence: RecurrenceRule | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC midnight of the given date, as epoch millis. */
function startOfUtcDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

/** Builds a Date on `dayMillis`' calendar date keeping `time`'s UTC time-of-day. */
function withTimeOfDay(dayMillis: number, time: Date): Date {
  const day = new Date(dayMillis);
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      time.getUTCSeconds(),
    ),
  );
}

function wholeDaysBetween(fromDayMillis: number, toDayMillis: number): number {
  return Math.round((toDayMillis - fromDayMillis) / MS_PER_DAY);
}

/**
 * Expands an event into the concrete start datetimes that fall within
 * `[fromDate, toDate]` (inclusive). Single events resolve to at most their one
 * `startDate`. All weekday / time-of-day math is performed in UTC so results are
 * deterministic regardless of server timezone.
 */
export function expandOccurrences(
  event: ExpandableEvent,
  fromDate: Date,
  toDate: Date,
): Date[] {
  const startDayMillis = startOfUtcDay(event.startDate);

  // Upper bound on the iteration window: the requested end, clamped to the
  // recurrence end (if any).
  let windowEndMillis = startOfUtcDay(toDate);
  if (event.frequency === 'recurring' && event.recurrence?.until) {
    windowEndMillis = Math.min(
      windowEndMillis,
      startOfUtcDay(event.recurrence.until),
    );
  }

  // Never iterate before the event's own start.
  const windowStartMillis = Math.max(startDayMillis, startOfUtcDay(fromDate));

  if (windowStartMillis > windowEndMillis) {
    return [];
  }

  if (event.frequency === 'single' || !event.recurrence) {
    // The single occurrence is the start date itself, included only when it
    // falls within the requested window.
    const startMillis = event.startDate.getTime();
    return startMillis >= fromDate.getTime() && startMillis <= toDate.getTime()
      ? [event.startDate]
      : [];
  }

  const rule = event.recurrence;
  const interval = Math.max(1, rule.interval);
  const startWeekday = new Date(startDayMillis).getUTCDay();
  const byDay =
    rule.freq === 'weekly'
      ? (rule.byDay && rule.byDay.length > 0 ? rule.byDay : [startWeekday])
      : null;

  const results: Date[] = [];

  for (
    let dayMillis = windowStartMillis;
    dayMillis <= windowEndMillis && results.length < MAX_EXPANDED_OCCURRENCES;
    dayMillis += MS_PER_DAY
  ) {
    if (isOccurrenceDay(dayMillis, startDayMillis, startWeekday, rule.freq, interval, byDay)) {
      const candidate = withTimeOfDay(dayMillis, event.startDate);
      // Guard the lower edge: the first/last partial day may carry a time-of-day
      // outside the precise [from, to] instants.
      if (
        candidate.getTime() >= fromDate.getTime() &&
        candidate.getTime() <= toDate.getTime() &&
        candidate.getTime() >= event.startDate.getTime()
      ) {
        results.push(candidate);
      }
    }
  }

  return results;
}

function isOccurrenceDay(
  dayMillis: number,
  startDayMillis: number,
  startWeekday: number,
  freq: RecurrenceFrequency,
  interval: number,
  byDay: number[] | null,
): boolean {
  if (dayMillis < startDayMillis) {
    return false;
  }

  switch (freq) {
    case 'daily': {
      const dayOffset = wholeDaysBetween(startDayMillis, dayMillis);
      return dayOffset % interval === 0;
    }
    case 'weekly': {
      const current = new Date(dayMillis);
      const currentWeekday = current.getUTCDay();
      if (!byDay!.includes(currentWeekday)) {
        return false;
      }
      // Align weeks to the start date's week (week starts on Sunday, UTC).
      const startWeekStart = startDayMillis - startWeekday * MS_PER_DAY;
      const currentWeekStart = dayMillis - currentWeekday * MS_PER_DAY;
      const weekIndex = Math.round(
        wholeDaysBetween(startWeekStart, currentWeekStart) / 7,
      );
      return weekIndex >= 0 && weekIndex % interval === 0;
    }
    case 'monthly': {
      const start = new Date(startDayMillis);
      const current = new Date(dayMillis);
      if (current.getUTCDate() !== start.getUTCDate()) {
        return false;
      }
      const monthIndex =
        (current.getUTCFullYear() - start.getUTCFullYear()) * 12 +
        (current.getUTCMonth() - start.getUTCMonth());
      return monthIndex >= 0 && monthIndex % interval === 0;
    }
    default:
      return false;
  }
}
