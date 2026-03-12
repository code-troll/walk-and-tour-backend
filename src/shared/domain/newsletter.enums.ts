export const NEWSLETTER_SUBSCRIPTION_STATUSES = [
  'pending_confirmation',
  'subscribed',
  'unsubscribed',
] as const;

export type NewsletterSubscriptionStatus =
  (typeof NEWSLETTER_SUBSCRIPTION_STATUSES)[number];
