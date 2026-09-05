/**
 * `disabled` is a hotel that must not sign in for now; `archived` is one that is
 * finished. The difference is what each releases: a disabled hotel keeps its
 * access user and its CVR, because it is coming back. An archived one gives both
 * up, so the same company can be registered again and the same address can be
 * used by somebody else — which is the only reason to archive rather than
 * disable.
 */
export const HOTEL_STATUSES = ['active', 'disabled', 'archived'] as const;
export type HotelStatus = (typeof HOTEL_STATUSES)[number];

export const HOTEL_USER_STATUSES = ['invited', 'active', 'disabled'] as const;
export type HotelUserStatus = (typeof HOTEL_USER_STATUSES)[number];
