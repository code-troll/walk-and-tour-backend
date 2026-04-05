import { Injectable, Logger } from '@nestjs/common';

import { ProviderConfig } from '../../shared/config/provider.config';
import {
  EmailProvider,
  SendNewsletterConfirmationEmailInput,
  SendProposalLinkEmailInput,
} from './email-provider.interface';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  constructor(private readonly config: ProviderConfig) {}

  async sendNewsletterConfirmation(
    input: SendNewsletterConfirmationEmailInput,
  ): Promise<void> {
    this.logger.log(
      JSON.stringify({
        provider: 'console',
        from: this.config.emailFrom,
        to: input.recipientEmail,
        subject: 'Confirm your Walk and Tour newsletter subscription',
        confirmationUrl: input.confirmationUrl,
        unsubscribeUrl: input.unsubscribeUrl,
        preferredLocale: input.preferredLocale ?? null,
      }),
    );
  }

  async sendProposalLink(
    input: SendProposalLinkEmailInput,
  ): Promise<void> {
    this.logger.log(
      JSON.stringify({
        provider: 'console',
        from: this.config.emailFrom,
        to: input.recipientEmail,
        subject: `Your tour proposal: ${input.firstVersionTitle}`,
        recipientName: input.recipientName,
        proposalUrl: input.proposalUrl,
        language: input.language,
        publicBaseUrl: input.publicBaseUrl,
      }),
    );
  }
}
