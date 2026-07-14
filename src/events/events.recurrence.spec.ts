import {
  ExpandableEvent,
  expandOccurrences,
  MAX_EXPANDED_OCCURRENCES,
} from './events.recurrence';

function single(startIso: string): ExpandableEvent {
  return { frequency: 'single', startDate: new Date(startIso), recurrence: null };
}

function recurring(
  startIso: string,
  recurrence: ExpandableEvent['recurrence'],
): ExpandableEvent {
  return { frequency: 'recurring', startDate: new Date(startIso), recurrence };
}

const iso = (dates: Date[]): string[] => dates.map((d) => d.toISOString());

describe('expandOccurrences', () => {
  it('returns the single start date when it falls inside the window', () => {
    const result = expandOccurrences(
      single('2026-07-01T10:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    );

    expect(iso(result)).toEqual(['2026-07-01T10:00:00.000Z']);
  });

  it('returns nothing for a single event outside the window', () => {
    const result = expandOccurrences(
      single('2026-07-01T10:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z'),
    );

    expect(result).toEqual([]);
  });

  it('expands a daily rule keeping the start time-of-day', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'daily',
        interval: 1,
        byDay: null,
        until: new Date('2026-12-31T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-05T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-02T10:00:00.000Z',
      '2026-07-03T10:00:00.000Z',
      '2026-07-04T10:00:00.000Z',
      '2026-07-05T10:00:00.000Z',
    ]);
  });

  it('clamps expansion to the recurrence end date', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'daily',
        interval: 1,
        byDay: null,
        until: new Date('2026-07-03T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-10T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-02T10:00:00.000Z',
      '2026-07-03T10:00:00.000Z',
    ]);
  });

  it('expands a weekly rule with selected weekdays', () => {
    // 2026-07-01 is a Wednesday. byDay = Mon(1), Wed(3), Fri(5).
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'weekly',
        interval: 1,
        byDay: [1, 3, 5],
        until: new Date('2026-12-31T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-14T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z', // Wed
      '2026-07-03T10:00:00.000Z', // Fri
      '2026-07-06T10:00:00.000Z', // Mon
      '2026-07-08T10:00:00.000Z', // Wed
      '2026-07-10T10:00:00.000Z', // Fri
      '2026-07-13T10:00:00.000Z', // Mon
    ]);
  });

  it('honours the weekly interval (every other week)', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'weekly',
        interval: 2,
        byDay: [3], // Wednesdays
        until: new Date('2026-12-31T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-15T10:00:00.000Z',
      '2026-07-29T10:00:00.000Z',
    ]);
  });

  it('defaults weekly byDay to the start weekday', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'weekly',
        interval: 1,
        byDay: null,
        until: new Date('2026-12-31T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-21T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-08T10:00:00.000Z',
      '2026-07-15T10:00:00.000Z',
    ]);
  });

  it('expands a monthly rule on the same day-of-month', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'monthly',
        interval: 1,
        byDay: null,
        until: new Date('2026-12-31T00:00:00.000Z'),
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-10-01T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-08-01T10:00:00.000Z',
      '2026-09-01T10:00:00.000Z',
      '2026-10-01T10:00:00.000Z',
    ]);
  });

  it('expands an open-ended rule (no until) bounded by the window', () => {
    const result = expandOccurrences(
      recurring('2026-07-01T10:00:00.000Z', {
        freq: 'daily',
        interval: 1,
        byDay: null,
        until: null,
      }),
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-03T23:59:59.000Z'),
    );

    expect(iso(result)).toEqual([
      '2026-07-01T10:00:00.000Z',
      '2026-07-02T10:00:00.000Z',
      '2026-07-03T10:00:00.000Z',
    ]);
  });

  it('caps the number of expanded occurrences', () => {
    const result = expandOccurrences(
      recurring('2026-01-01T10:00:00.000Z', {
        freq: 'daily',
        interval: 1,
        byDay: null,
        until: new Date('2030-01-01T00:00:00.000Z'),
      }),
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2030-01-01T00:00:00.000Z'),
    );

    expect(result).toHaveLength(MAX_EXPANDED_OCCURRENCES);
  });
});
