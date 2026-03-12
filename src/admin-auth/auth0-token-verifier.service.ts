import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

import { getAuth0Config } from './auth0.config';

export interface VerifiedAuth0Claims extends JWTPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class Auth0TokenVerifierService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  async verifyBearerToken(token: string): Promise<VerifiedAuth0Claims> {
    const config = getAuth0Config();

    if (!config.issuerBaseUrl || !config.audience) {
      throw new UnauthorizedException('Auth0 configuration is missing.');
    }

    this.jwks ??= createRemoteJWKSet(
      new URL('.well-known/jwks.json', config.issuerBaseUrl),
    );

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: config.issuerBaseUrl,
        audience: config.audience,
      });

      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new UnauthorizedException('Auth0 subject claim is missing.');
      }

      return payload as VerifiedAuth0Claims;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired Auth0 access token.');
    }
  }
}
