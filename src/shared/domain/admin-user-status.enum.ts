export const ADMIN_USER_STATUSES = ['invited', 'active', 'disabled'] as const;

export type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number];
