import { AdminRole, AdminUserStatus } from '../shared/domain';

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  roleName: AdminRole;
  status: AdminUserStatus;
  auth0UserId: string | null;
}
