export const HOTEL_STATUSES = ['active', 'disabled'] as const;
export type HotelStatus = (typeof HOTEL_STATUSES)[number];

export const HOTEL_USER_STATUSES = ['invited', 'active', 'disabled'] as const;
export type HotelUserStatus = (typeof HOTEL_USER_STATUSES)[number];
