import { Injectable } from '@nestjs/common';

import { ProviderConfig } from '../../shared/config/provider.config';
import {
  EmailProvider,
  SendNewsletterConfirmationEmailInput,
} from './email-provider.interface';

interface FetchLike {
  (input: string, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly config: ProviderConfig,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async sendNewsletterConfirmation(
    input: SendNewsletterConfirmationEmailInput,
  ): Promise<void> {
    if (!this.config.resendApiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
    }

    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.emailFrom,
        to: [input.recipientEmail],
        subject: 'Confirm your Walk and Tour newsletter subscription',
        html: this.renderHtml(input),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Resend email delivery failed with status ${response.status}: ${await response.text()}`,
      );
    }
  }

  private renderHtml(input: SendNewsletterConfirmationEmailInput): string {
    return [
      '<p>Confirm your Walk and Tour newsletter subscription.</p>',
      `<p><a href="${escapeHtml(input.confirmationUrl)}">Confirm subscription</a></p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
      `<p><a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe</a></p>`,
    ].join('');
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
