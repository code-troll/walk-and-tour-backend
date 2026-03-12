import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminUsersService } from '../admin-users/admin-users.service';
import { ADMIN_USER_STATUSES } from '../shared/domain';
import { AuthenticatedAdmin } from './authenticated-admin.interface';
import { VerifiedAuth0Claims } from './auth0-token-verifier.service';

@Injectable()
export class AdminAuthService {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  async resolveAuthenticatedAdmin(
    claims: VerifiedAuth0Claims,
  ): Promise<AuthenticatedAdmin> {
    let adminUser = await this.adminUsersService.findByAuth0UserId(claims.sub);

    if (!adminUser && claims.email) {
      const adminByEmail = await this.adminUsersService.findByEmail(claims.email);

      if (adminByEmail) {
        adminUser =
          adminByEmail.auth0UserId === null
            ? await this.adminUsersService.bindAuth0Identity(adminByEmail, claims.sub)
            : null;
      }
    }

    if (!adminUser) {
      throw new UnauthorizedException('No local admin user is mapped to this Auth0 identity.');
    }

    if (!ADMIN_USER_STATUSES.includes(adminUser.status as (typeof ADMIN_USER_STATUSES)[number])) {
      throw new ForbiddenException('Admin user status is invalid.');
    }

    if (adminUser.status === 'disabled') {
      throw new ForbiddenException('Admin user is disabled.');
    }

    if (adminUser.status === 'invited') {
      throw new ForbiddenException('Admin user has not activated access yet.');
    }

    adminUser = await this.adminUsersService.updateLastLogin(adminUser);

    return {
      id: adminUser.id,
      email: adminUser.email,
      roleName: adminUser.roleName as AuthenticatedAdmin['roleName'],
      status: adminUser.status as AuthenticatedAdmin['status'],
      auth0UserId: adminUser.auth0UserId,
    };
  }
}
