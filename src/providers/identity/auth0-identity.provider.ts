import { randomBytes } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { ProviderConfig } from '../../shared/config/provider.config';
import {
  CreateIdentityUserInput,
  CreateIdentityUserResult,
  CreatePasswordSetupTicketInput,
  CreatePasswordSetupTicketResult,
  IdentityProvider,
  IdentityUserConflictError,
} from './identity-provider.interface';

interface ManagementToken {
  accessToken: string;
  expiresAt: number;
}

/** Refresh a little before expiry so a request never races the clock. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

@Injectable()
export class Auth0IdentityProvider implements IdentityProvider {
  private readonly logger = new Logger(Auth0IdentityProvider.name);
  private managementToken?: ManagementToken;

  constructor(private readonly config: ProviderConfig) {}

  async createUser(input: CreateIdentityUserInput): Promise<CreateIdentityUserResult> {
    const payload = {
      connection: this.config.hotelIdentityConnection,
      username: input.username,
      email: input.email,
      name: input.displayName,
      // The hotel never learns this. It is replaced by the password the hotel
      // chooses through the setup ticket.
      password: `${randomBytes(24).toString('base64url')}Aa1!`,
      email_verified: true,
      verify_email: false,
    };

    const response = await this.request('/api/v2/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      throw new IdentityUserConflictError(
        `Auth0 already has a user with username "${input.username}" or email "${input.email}".`,
      );
    }

    const body = await this.readJson(response, 'create the identity user');
    const identityUserId = (body as { user_id?: string }).user_id;

    if (!identityUserId) {
      throw new Error('Auth0 did not return a user identifier for the created user.');
    }

    return { identityUserId };
  }

  async createPasswordSetupTicket(
    input: CreatePasswordSetupTicketInput,
  ): Promise<CreatePasswordSetupTicketResult> {
    const response = await this.request('/api/v2/tickets/password-change', {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.identityUserId,
        result_url: input.resultUrl,
        ttl_sec: input.ttlSeconds,
        mark_email_as_verified: true,
      }),
    });

    const body = await this.readJson(response, 'create the password setup ticket');
    const ticketUrl = (body as { ticket?: string }).ticket;

    if (!ticketUrl) {
      throw new Error('Auth0 did not return a password setup ticket.');
    }

    return {
      ticketUrl,
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
    };
  }

  async blockUser(identityUserId: string): Promise<void> {
    await this.patchUser(identityUserId, { blocked: true });
  }

  async unblockUser(identityUserId: string): Promise<void> {
    await this.patchUser(identityUserId, { blocked: false });
  }

  async deleteUser(identityUserId: string): Promise<void> {
    const response = await this.request(
      `/api/v2/users/${encodeURIComponent(identityUserId)}`,
      { method: 'DELETE' },
    );

    if (!response.ok && response.status !== 404) {
      await this.readJson(response, 'delete the identity user');
    }
  }

  private async patchUser(
    identityUserId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const response = await this.request(
      `/api/v2/users/${encodeURIComponent(identityUserId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    );

    await this.readJson(response, 'update the identity user');
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.getManagementToken();

    return fetch(`${this.issuerBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  }

  private async readJson(response: Response, action: string): Promise<unknown> {
    if (response.status === 429) {
      throw new Error(
        `Auth0 rate limit reached while trying to ${action}. Retry in a moment.`,
      );
    }

    const text = await response.text();
    const payload: unknown = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message =
        (payload as { message?: string } | null)?.message ?? `HTTP ${response.status}`;
      throw new Error(`Auth0 refused to ${action}: ${message}`);
    }

    return payload;
  }

  /**
   * Client-credentials token for the Management API, cached until shortly
   * before it expires. It is fetched lazily so the application still boots when
   * identity credentials are absent.
   */
  private async getManagementToken(): Promise<string> {
    if (this.managementToken && this.managementToken.expiresAt > Date.now()) {
      return this.managementToken.accessToken;
    }

    const { identityManagementClientId, identityManagementClientSecret } = this.config;

    if (!identityManagementClientId || !identityManagementClientSecret) {
      throw new Error(
        'Auth0 management credentials are missing. Set IDENTITY_MANAGEMENT_CLIENT_ID and IDENTITY_MANAGEMENT_CLIENT_SECRET, or use IDENTITY_PROVIDER=console.',
      );
    }

    const response = await fetch(`${this.issuerBaseUrl()}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: identityManagementClientId,
        client_secret: identityManagementClientSecret,
        audience: `${this.issuerBaseUrl()}/api/v2/`,
      }),
    });

    const body = (await this.readJson(response, 'obtain a management token')) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!body.access_token) {
      throw new Error('Auth0 did not return a management access token.');
    }

    this.managementToken = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 - TOKEN_EXPIRY_MARGIN_MS,
    };

    this.logger.log('Obtained a new Auth0 management token.');

    return body.access_token;
  }

  private issuerBaseUrl(): string {
    return this.config.identityIssuerBaseUrl.replace(/\/+$/, '');
  }
}
