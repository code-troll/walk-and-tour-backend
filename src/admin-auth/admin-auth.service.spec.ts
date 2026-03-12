import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminUsersService } from '../admin-users/admin-users.service';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let adminUsersService: jest.Mocked<AdminUsersService>;

  beforeEach(() => {
    adminUsersService = {
      findByAuth0UserId: jest.fn(),
      findByEmail: jest.fn(),
      bindAuth0Identity: jest.fn(),
      updateLastLogin: jest.fn(),
    } as unknown as jest.Mocked<AdminUsersService>;

    service = new AdminAuthService(adminUsersService);
  });

  it('resolves an already linked admin user', async () => {
    const adminUser = {
      id: 'admin-1',
      email: 'admin@example.com',
      roleName: 'super_admin',
      status: 'active',
      auth0UserId: 'auth0|123',
    };

    adminUsersService.findByAuth0UserId.mockResolvedValue(adminUser as never);
    adminUsersService.updateLastLogin.mockResolvedValue(adminUser as never);

    await expect(
      service.resolveAuthenticatedAdmin({
        sub: 'auth0|123',
        email: 'admin@example.com',
      }),
    ).resolves.toEqual(adminUser);

    expect(adminUsersService.findByAuth0UserId).toHaveBeenCalledWith('auth0|123');
    expect(adminUsersService.updateLastLogin).toHaveBeenCalledWith(adminUser);
  });

  it('binds an existing email-only admin to the incoming auth0 identity', async () => {
    const pendingAdmin = {
      id: 'admin-1',
      email: 'admin@example.com',
      roleName: 'editor',
      status: 'active',
      auth0UserId: null,
    };
    const boundAdmin = {
      ...pendingAdmin,
      auth0UserId: 'auth0|new',
    };

    adminUsersService.findByAuth0UserId.mockResolvedValue(null as never);
    adminUsersService.findByEmail.mockResolvedValue(pendingAdmin as never);
    adminUsersService.bindAuth0Identity.mockResolvedValue(boundAdmin as never);
    adminUsersService.updateLastLogin.mockResolvedValue(boundAdmin as never);

    await expect(
      service.resolveAuthenticatedAdmin({
        sub: 'auth0|new',
        email: 'admin@example.com',
      }),
    ).resolves.toEqual(boundAdmin);
  });

  it('rejects identities without a local admin mapping', async () => {
    adminUsersService.findByAuth0UserId.mockResolvedValue(null as never);
    adminUsersService.findByEmail.mockResolvedValue(null as never);

    await expect(
      service.resolveAuthenticatedAdmin({
        sub: 'auth0|missing',
        email: 'missing@example.com',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects disabled admins', async () => {
    adminUsersService.findByAuth0UserId.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roleName: 'editor',
      status: 'disabled',
      auth0UserId: 'auth0|123',
    } as never);

    await expect(
      service.resolveAuthenticatedAdmin({
        sub: 'auth0|123',
        email: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invited admins', async () => {
    adminUsersService.findByAuth0UserId.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      roleName: 'editor',
      status: 'invited',
      auth0UserId: 'auth0|123',
    } as never);

    await expect(
      service.resolveAuthenticatedAdmin({
        sub: 'auth0|123',
        email: 'admin@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
