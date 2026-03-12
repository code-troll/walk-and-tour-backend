import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AdminAuthService } from '../admin-auth.service';
import { Auth0TokenVerifierService } from '../auth0-token-verifier.service';
import { AdminJwtAuthGuard } from './admin-jwt-auth.guard';

describe('AdminJwtAuthGuard', () => {
  let guard: AdminJwtAuthGuard;
  let tokenVerifierService: jest.Mocked<Auth0TokenVerifierService>;
  let adminAuthService: jest.Mocked<AdminAuthService>;

  beforeEach(() => {
    tokenVerifierService = {
      verifyBearerToken: jest.fn(),
    } as unknown as jest.Mocked<Auth0TokenVerifierService>;
    adminAuthService = {
      resolveAuthenticatedAdmin: jest.fn(),
    } as unknown as jest.Mocked<AdminAuthService>;
    guard = new AdminJwtAuthGuard(tokenVerifierService, adminAuthService);
  });

  it('verifies the bearer token and attaches the authenticated admin', async () => {
    const request: {
      headers: { authorization: string };
      admin?: unknown;
    } = {
      headers: {
        authorization: 'Bearer token-123',
      },
    };
    const claims = { sub: 'auth0|123', email: 'admin@example.com' };
    const admin = { id: 'admin-1', roleName: 'super_admin' };

    tokenVerifierService.verifyBearerToken.mockResolvedValue(claims as never);
    adminAuthService.resolveAuthenticatedAdmin.mockResolvedValue(admin as never);

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenVerifierService.verifyBearerToken).toHaveBeenCalledWith('token-123');
    expect(request.admin).toEqual(admin);
  });

  it('rejects missing authorization headers', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
