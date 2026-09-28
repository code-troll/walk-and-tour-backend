export const TOUR_TYPES = ['private', 'group', 'tip_based', 'company'] as const;

/**
 * What a tour's fixed price buys. Not "group" alone, because `group` is already
 * a tour type, and a private tour is the usual case for a per-group price.
 */
export const TOUR_PRICE_BASES = ['per_person', 'per_group'] as const;

/**
 * Booking widgets a tour can embed on its public page. The account each one
 * books against is frontend configuration; a tour only picks the provider, and
 * each translation's `bookingReferenceId` is the provider's product id.
 */
export const TOUR_BOOKING_PROVIDERS = ['turitop'] as const;

export const TOUR_COMMUTE_MODES = [
  'walk',
  'bike',
  'bus',
  'train',
  'metro',
  'tram',
  'ferry',
  'private-transport',
  'boat',
  'other',
] as const;

export type TourType = (typeof TOUR_TYPES)[number];

export type TourPriceBasis = (typeof TOUR_PRICE_BASES)[number];

export type TourBookingProvider = (typeof TOUR_BOOKING_PROVIDERS)[number];

export type TourCommuteMode = (typeof TOUR_COMMUTE_MODES)[number];
