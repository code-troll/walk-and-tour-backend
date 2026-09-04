export const HOTEL_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'invoiced',
] as const;
export type HotelBookingStatus = (typeof HOTEL_BOOKING_STATUSES)[number];

/**
 * Statuses a booking can no longer move out of. `invoiced` freezes the money as
 * well: a correction after invoicing has to be a new decision, not a silent
 * edit of a figure someone has already been billed for.
 */
export const TERMINAL_HOTEL_BOOKING_STATUSES: readonly HotelBookingStatus[] = [
  'cancelled',
  'invoiced',
];

/** Statuses in which line items and participant counts may still change. */
export const EDITABLE_HOTEL_BOOKING_STATUSES: readonly HotelBookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
];

export const HOTEL_BOOKING_ACTOR_TYPES = ['hotel', 'admin'] as const;
export type HotelBookingActorType = (typeof HOTEL_BOOKING_ACTOR_TYPES)[number];

export const HOTEL_BOOKING_LOG_TYPES = [
  'created',
  'status_changed',
  'updated',
  'line_item_added',
  'line_item_removed',
] as const;
export type HotelBookingLogType = (typeof HOTEL_BOOKING_LOG_TYPES)[number];

export const HOTEL_BOOKING_LINE_ITEM_KINDS = ['base', 'extra'] as const;
export type HotelBookingLineItemKind = (typeof HOTEL_BOOKING_LINE_ITEM_KINDS)[number];

/**
 * The only currency hotel bookings are written in. Kept as a closed list rather
 * than free text so a booking cannot be created in a currency nothing else
 * understands, and so adding one later is a deliberate change.
 */
export const HOTEL_BOOKING_CURRENCIES = ['DKK'] as const;
export type HotelBookingCurrency = (typeof HOTEL_BOOKING_CURRENCIES)[number];
export const DEFAULT_HOTEL_BOOKING_CURRENCY: HotelBookingCurrency = 'DKK';

/**
 * Who may move a booking from one status to another.
 *
 * This is the whole rule, in one place. Controllers never decide a transition
 * and never accept a status from a request body; they name an action and this
 * table says whether the actor may take it.
 */
export const ALLOWED_HOTEL_BOOKING_TRANSITIONS: Record<
  HotelBookingStatus,
  Partial<Record<HotelBookingStatus, readonly HotelBookingActorType[]>>
> = {
  pending: {
    confirmed: ['admin'],
    cancelled: ['hotel', 'admin'],
  },
  confirmed: {
    completed: ['admin'],
    cancelled: ['hotel', 'admin'],
  },
  completed: {
    invoiced: ['admin'],
    cancelled: ['admin'],
  },
  cancelled: {},
  invoiced: {},
};

export const canTransition = ({
  from,
  to,
  actorType,
}: {
  from: HotelBookingStatus;
  to: HotelBookingStatus;
  actorType: HotelBookingActorType;
}): boolean =>
  (ALLOWED_HOTEL_BOOKING_TRANSITIONS[from]?.[to] ?? []).includes(actorType);
