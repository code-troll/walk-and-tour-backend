import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminUserEntity } from '../admin-users/admin-user.entity';
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

    if (!adminUser) {
      adminUser = await this.claimPendingAdminInvitation(claims);
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

  /**
   * First-login binding for an admin that was created with an email address but
   * no Auth0 subject yet.
   *
   * This is the only path that lets an unknown Auth0 subject take over an
   * existing admin account, so it deliberately requires a verified email claim.
   * The tenant hosts more than one population of identities, and every access
   * token is verified against the same audience, so an unverified email claim
   * would be enough for an identity from another connection to claim a pending
   * admin invitation.
   */
  private async claimPendingAdminInvitation(
    claims: VerifiedAuth0Claims,
  ): Promise<AdminUserEntity | null> {
    if (!claims.email) {
      return null;
    }

    const adminByEmail = await this.adminUsersService.findByEmail(claims.email);

    if (!adminByEmail || adminByEmail.auth0UserId !== null) {
      return null;
    }

    if (claims.email_verified !== true) {
      throw new UnauthorizedException(
        'An admin invitation exists for this email address, but the Auth0 identity presenting it does not carry a verified email claim, so it cannot be linked automatically.',
      );
    }

    return this.adminUsersService.bindAuth0Identity(adminByEmail, claims.sub);
  }
}
