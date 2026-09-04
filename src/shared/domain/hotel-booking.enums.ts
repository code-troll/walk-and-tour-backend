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
 * The currencies a hotel booking may be written in. A closed list rather than
 * free text, so a booking cannot be created in a currency nothing else
 * understands and adding one stays a deliberate change.
 *
 * EUR is here because it was already in the data. `tours.price_currency` is
 * nullable free text and the tour form defaults new tours to EUR, while every
 * booking was written `DKK` regardless — so a tour priced at 199 EUR produced a
 * booking that said 199 DKK. A booking now takes the currency of the tour it is
 * for, which is the only reading under which the number on the invoice is the
 * number that was quoted.
 *
 * The consequence is real and deliberate: one hotel can now hold bookings in
 * two currencies, so a total across them is not a sum. Anything that adds up
 * bookings has to group by currency rather than assume one.
 */
export const HOTEL_BOOKING_CURRENCIES = ['DKK', 'EUR'] as const;
export type HotelBookingCurrency = (typeof HOTEL_BOOKING_CURRENCIES)[number];

/** Used when a tour names no currency at all, which most legacy rows do. */
export const DEFAULT_HOTEL_BOOKING_CURRENCY: HotelBookingCurrency = 'DKK';

/**
 * The currency to bill a tour in.
 *
 * `tours.price_currency` is `varchar(10)` and nullable, so it can hold anything
 * an editor typed. Anything not on the list falls back to the default rather
 * than reaching the database, because `hotel_bookings.currency` is `char(3)`
 * and a longer value would fail on insert instead of at the boundary.
 */
export const resolveTourCurrency = (
  priceCurrency: string | null | undefined,
): HotelBookingCurrency => {
  const code = priceCurrency?.trim().toUpperCase();

  return HOTEL_BOOKING_CURRENCIES.find((currency) => currency === code)
    ?? DEFAULT_HOTEL_BOOKING_CURRENCY;
};

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
