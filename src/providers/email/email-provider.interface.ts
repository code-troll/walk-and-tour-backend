export interface SendNewsletterConfirmationEmailInput {
  recipientEmail: string;
  confirmationUrl: string;
  unsubscribeUrl: string;
  preferredLocale?: string | null;
}

export interface SendProposalLinkEmailInput {
  recipientEmail: string;
  recipientName: string | null;
  proposalUrl: string;
  firstVersionTitle: string;
  language: string;
  publicBaseUrl: string;
}

export interface EmailProvider {
  sendNewsletterConfirmation(
    input: SendNewsletterConfirmationEmailInput,
  ): Promise<void>;

  sendProposalLink(
    input: SendProposalLinkEmailInput,
  ): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
