export const HOTEL_STATUSES = ['active', 'disabled'] as const;
export type HotelStatus = (typeof HOTEL_STATUSES)[number];
