import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminRequest } from '../admin-request.interface';
import { AdminAuthService } from '../admin-auth.service';
import { Auth0TokenVerifierService } from '../auth0-token-verifier.service';

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenVerifierService: Auth0TokenVerifierService,
    private readonly adminAuthService: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = extractBearerToken(request.headers.authorization);

    const claims = await this.tokenVerifierService.verifyBearerToken(token);
    request.admin = await this.adminAuthService.resolveAuthenticatedAdmin(claims);

    return true;
  }
}

function extractBearerToken(value: string | string[] | undefined): string {
  if (!value) {
    throw new UnauthorizedException('Missing Authorization header.');
  }

  if (Array.isArray(value)) {
    throw new UnauthorizedException('Authorization header must be a single Bearer token.');
  }

  const [scheme, token] = value.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Authorization header must use Bearer token format.');
  }

  return token;
}
