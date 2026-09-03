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

export interface SendHotelPasswordSetupEmailInput {
  recipientEmail: string;
  hotelName: string;
  username: string;
  /** Identity-provider ticket that lets the hotel choose its own password. */
  setupUrl: string;
  expiresAt: Date;
  /** True when this is a repeat send rather than the original invitation. */
  isResend: boolean;
}

export interface EmailProvider {
  sendNewsletterConfirmation(
    input: SendNewsletterConfirmationEmailInput,
  ): Promise<void>;

  sendProposalLink(
    input: SendProposalLinkEmailInput,
  ): Promise<void>;

  sendHotelPasswordSetup(
    input: SendHotelPasswordSetupEmailInput,
  ): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
