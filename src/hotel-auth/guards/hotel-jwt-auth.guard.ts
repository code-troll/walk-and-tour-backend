import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Auth0TokenVerifierService } from '../../admin-auth/auth0-token-verifier.service';
import { HotelAuthService } from '../hotel-auth.service';
import { HotelRequest } from '../hotel-request.interface';

/**
 * Guards every hotel-facing route.
 *
 * Token verification is shared with the admin side — both populations sit in one
 * tenant behind one API audience, so a token proves only that the identity is
 * real, not which population it belongs to. That separation is made here, by
 * resolving the subject against `hotel_users` and nowhere else.
 */
@Injectable()
export class HotelJwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenVerifierService: Auth0TokenVerifierService,
    private readonly hotelAuthService: HotelAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HotelRequest>();
    const token = extractBearerToken(request.headers.authorization);

    const claims = await this.tokenVerifierService.verifyBearerToken(token);
    request.hotelUser =
      await this.hotelAuthService.resolveAuthenticatedHotelUser(claims);

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
