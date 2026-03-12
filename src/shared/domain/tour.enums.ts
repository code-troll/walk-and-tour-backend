export const TOUR_PUBLICATION_STATUSES = ['draft', 'published'] as const;

export const TOUR_TRANSLATION_STATUSES = ['draft', 'ready'] as const;

export const TOUR_TRANSLATION_PUBLICATION_STATUSES = [
  'published',
  'unpublished',
] as const;

export const TOUR_TYPES = ['private', 'group', 'tip_based'] as const;

export const TOUR_CANCELLATION_TYPES = [
  '12h_free_cancellation',
  '24h_free_cancellation',
  '48h_free_cancellation',
  '72h_free_cancellation',
] as const;

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

export type TourPublicationStatus =
  (typeof TOUR_PUBLICATION_STATUSES)[number];

export type TourTranslationStatus =
  (typeof TOUR_TRANSLATION_STATUSES)[number];

export type TourTranslationPublicationStatus =
  (typeof TOUR_TRANSLATION_PUBLICATION_STATUSES)[number];

export type TourType = (typeof TOUR_TYPES)[number];

export type TourCancellationType =
  (typeof TOUR_CANCELLATION_TYPES)[number];

export type TourCommuteMode = (typeof TOUR_COMMUTE_MODES)[number];
