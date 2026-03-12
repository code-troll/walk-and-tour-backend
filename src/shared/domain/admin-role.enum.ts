export const ADMIN_ROLES = ['super_admin', 'editor', 'marketing'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
