export const TOUR_TYPES = ['private', 'group', 'tip_based', 'company'] as const;

/**
 * What a tour's fixed price buys. Not "group" alone, because `group` is already
 * a tour type, and a private tour is the usual case for a per-group price.
 */
export const TOUR_PRICE_BASES = ['per_person', 'per_group'] as const;

/**
 * Booking widgets a tour can embed on its public page. Turitop books against
 * our own account, which is frontend configuration. Understory books against a
 * partner's account, so the tour carries it in its booking settings.
 */
export const TOUR_BOOKING_PROVIDERS = ['turitop', 'understory'] as const;

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

/**
 * What each provider needs besides its name. `settingKeys` are stored on the
 * tour and are all required once the widget is enabled. A provider that
 * requires a product id shows the widget only in locales whose
 * `bookingReferenceId` is set; for Understory it is optional and names one
 * experience within the storefront.
 */
export const TOUR_BOOKING_PROVIDER_RULES: Record<
  TourBookingProvider,
  { settingKeys: readonly string[]; requiresProductId: boolean }
> = {
  turitop: { settingKeys: [], requiresProductId: true },
  understory: { settingKeys: ['companyId', 'storefrontId'], requiresProductId: false },
};

export type TourCommuteMode = (typeof TOUR_COMMUTE_MODES)[number];
