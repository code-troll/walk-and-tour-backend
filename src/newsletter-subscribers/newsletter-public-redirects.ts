import { getProviderConfig } from '../shared/config/provider.config';

type NewsletterPublicFlow = 'confirm' | 'unsubscribe';
type NewsletterPublicStatus = 'success' | 'error';
type NewsletterPublicReason =
  | 'invalid_token'
  | 'invalid_state'
  | 'server_error';

export function buildNewsletterPublicRedirectUrl(
  flow: NewsletterPublicFlow,
  status: NewsletterPublicStatus,
  reason?: NewsletterPublicReason,
): string {
  const { newsletterPublicAppBaseUrl, appBaseUrl } = getProviderConfig();
  const pathname =
    flow === 'confirm' ? '/newsletter/confirm' : '/newsletter/unsubscribe';
  const url = new URL(
    pathname,
    ensureTrailingSlash(newsletterPublicAppBaseUrl ?? appBaseUrl),
  );

  url.searchParams.set('status', status);

  if (reason) {
    url.searchParams.set('reason', reason);
  }

  return url.toString();
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
