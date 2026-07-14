export const EVENT_TYPES = ['free', 'paid'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_FREQUENCIES = ['single', 'recurring'] as const;
export type EventFrequency = (typeof EVENT_FREQUENCIES)[number];

export const EVENT_STATUSES = ['active', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export const OCCURRENCE_STATUSES = ['confirmed', 'cancelled'] as const;
export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];
