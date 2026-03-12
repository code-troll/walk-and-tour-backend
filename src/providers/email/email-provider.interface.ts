export interface SendNewsletterConfirmationEmailInput {
  recipientEmail: string;
  confirmationUrl: string;
  unsubscribeUrl: string;
  preferredLocale?: string | null;
}

export interface EmailProvider {
  sendNewsletterConfirmation(
    input: SendNewsletterConfirmationEmailInput,
  ): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
