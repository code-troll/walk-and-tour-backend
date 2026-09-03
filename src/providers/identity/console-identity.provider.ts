import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { ProviderConfig } from '../../shared/config/provider.config';
import {
  CreateIdentityUserInput,
  CreateIdentityUserResult,
  CreatePasswordSetupTicketInput,
  CreatePasswordSetupTicketResult,
  IdentityProvider,
} from './identity-provider.interface';

/**
 * Development implementation. It is the default so the invite flow can be
 * exercised locally without machine-to-machine credentials.
 *
 * The ticket URL it logs is a real, openable link into the hotel portal, and
 * the subject it returns is stable and recognisable, so a developer can follow
 * the same path a hotel would.
 */
@Injectable()
export class ConsoleIdentityProvider implements IdentityProvider {
  private readonly logger = new Logger(ConsoleIdentityProvider.name);

  constructor(private readonly config: ProviderConfig) {}

  async createUser(input: CreateIdentityUserInput): Promise<CreateIdentityUserResult> {
    const identityUserId = `console|${randomUUID()}`;

    this.logger.log(
      JSON.stringify({
        event: 'identity.createUser',
        username: input.username,
        email: input.email,
        displayName: input.displayName,
        identityUserId,
      }),
    );

    return { identityUserId };
  }

  async createPasswordSetupTicket(
    input: CreatePasswordSetupTicketInput,
  ): Promise<CreatePasswordSetupTicketResult> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    const ticketUrl = `${this.config.hotelPortalBaseUrl}/set-password?ticket=${encodeURIComponent(
      `console-${input.identityUserId}`,
    )}`;

    this.logger.log(
      JSON.stringify({
        event: 'identity.createPasswordSetupTicket',
        identityUserId: input.identityUserId,
        ticketUrl,
        resultUrl: input.resultUrl,
        expiresAt: expiresAt.toISOString(),
      }),
    );

    return { ticketUrl, expiresAt };
  }

  async blockUser(identityUserId: string): Promise<void> {
    this.logger.log(JSON.stringify({ event: 'identity.blockUser', identityUserId }));
  }

  async unblockUser(identityUserId: string): Promise<void> {
    this.logger.log(JSON.stringify({ event: 'identity.unblockUser', identityUserId }));
  }

  async deleteUser(identityUserId: string): Promise<void> {
    this.logger.log(JSON.stringify({ event: 'identity.deleteUser', identityUserId }));
  }
}
