import { Injectable } from '@nestjs/common';

import { ProviderConfig } from '../../shared/config/provider.config';
import {
  EmailProvider,
  SendNewsletterConfirmationEmailInput,
  SendProposalLinkEmailInput,
} from './email-provider.interface';

interface FetchLike {
  (input: string, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

type ProposalEmailStrings = {
  subject: string;
  greeting: string;
  greetingWithName: string;
  body: string;
  ctaLabel: string;
  copyLinkPrefix: string;
  questions: string;
  signoff: string;
  footer: string;
};

const PROPOSAL_EMAIL_I18N: Record<string, ProposalEmailStrings> = {
  en: {
    subject: 'Your tour proposal: {title}',
    greeting: 'Hi,',
    greetingWithName: 'Hi {name},',
    body: 'We have prepared a personalized tour proposal for you. Review the details and available options using the link below.',
    ctaLabel: 'View Your Proposal',
    copyLinkPrefix: 'Or copy this link:',
    questions: 'If you have any questions, feel free to reach out to us.',
    signoff: 'Best regards,',
    footer: 'Walk and Tour Copenhagen',
  },
  es: {
    subject: 'Tu propuesta de tour: {title}',
    greeting: 'Hola,',
    greetingWithName: 'Hola {name},',
    body: 'Hemos preparado una propuesta de tour personalizada para ti. Revisa los detalles y las opciones disponibles en el siguiente enlace.',
    ctaLabel: 'Ver tu propuesta',
    copyLinkPrefix: 'O copia este enlace:',
    questions: 'Si tienes alguna pregunta, no dudes en contactarnos.',
    signoff: 'Saludos cordiales,',
    footer: 'Walk and Tour Copenhague',
  },
  it: {
    subject: 'La tua proposta di tour: {title}',
    greeting: 'Ciao,',
    greetingWithName: 'Ciao {name},',
    body: 'Abbiamo preparato una proposta di tour personalizzata per te. Consulta i dettagli e le opzioni disponibili tramite il link qui sotto.',
    ctaLabel: 'Visualizza la tua proposta',
    copyLinkPrefix: 'Oppure copia questo link:',
    questions: 'Se hai domande, non esitare a contattarci.',
    signoff: 'Cordiali saluti,',
    footer: 'Walk and Tour Copenaghen',
  },
};

const getProposalStrings = (language: string): ProposalEmailStrings =>
  PROPOSAL_EMAIL_I18N[language] ?? PROPOSAL_EMAIL_I18N.en;

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
        html: this.renderNewsletterHtml(input),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Resend email delivery failed with status ${response.status}: ${await response.text()}`,
      );
    }
  }

  async sendProposalLink(input: SendProposalLinkEmailInput): Promise<void> {
    if (!this.config.resendApiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
    }

    const strings = getProposalStrings(input.language);
    const subject = strings.subject.replace('{title}', input.firstVersionTitle);

    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.config.emailFrom,
        to: [input.recipientEmail],
        subject,
        html: this.renderProposalHtml(input),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Resend email delivery failed with status ${response.status}: ${await response.text()}`,
      );
    }
  }

  private renderProposalHtml(input: SendProposalLinkEmailInput): string {
    const s = getProposalStrings(input.language);
    const logoUrl = `${input.publicBaseUrl}/walkandtour/branding/logo-formal.png`;
    const proposalUrl = escapeHtml(input.proposalUrl);
    const greeting = input.recipientName
      ? s.greetingWithName.replace('{name}', escapeHtml(input.recipientName))
      : s.greeting;

    return `<!DOCTYPE html>
<html lang="${escapeHtml(input.language)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f6f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f1e7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
        <!-- Header -->
        <tr>
          <td style="background-color:#fcfaf7;padding:28px 32px;text-align:center;border-bottom:1px solid #e8dfd4;">
            <img src="${escapeHtml(logoUrl)}" alt="Walk and Tour" height="48" style="height:48px;width:auto;"/>
          </td>
        </tr>
        <!-- Teal accent bar -->
        <tr>
          <td style="height:4px;background-color:#2b666d;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#2a221a;">${greeting}</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3d3124;">${s.body}</p>
            <!-- CTA Button -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr>
                <td style="border-radius:28px;background-color:#2b666d;text-align:center;">
                  <a href="${proposalUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${s.ctaLabel}</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#627176;text-align:center;word-break:break-all;">
              ${s.copyLinkPrefix} <a href="${proposalUrl}" style="color:#2b666d;text-decoration:underline;">${proposalUrl}</a>
            </p>
            <p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#3d3124;">${s.questions}</p>
          </td>
        </tr>
        <!-- Sign-off -->
        <tr>
          <td style="padding:0 32px 36px;">
            <p style="margin:0 0 4px;font-size:15px;color:#3d3124;">${s.signoff}</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#2b666d;">${s.footer}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#fcfaf7;padding:20px 32px;border-top:1px solid #e8dfd4;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9a8d7e;">&copy; Walk and Tour</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private renderNewsletterHtml(input: SendNewsletterConfirmationEmailInput): string {
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
