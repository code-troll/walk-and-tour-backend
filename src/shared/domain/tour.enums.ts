export const TOUR_TYPES = ['private', 'group', 'tip_based', 'company'] as const;

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

export type TourCommuteMode = (typeof TOUR_COMMUTE_MODES)[number];
