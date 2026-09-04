import {
  DEFAULT_EMAIL_FROM,
  DEFAULT_HOTEL_PORTAL_BASE_URL,
  ProviderConfig,
} from './provider.config';

/**
 * Configuration problems that do not stop the application from starting.
 *
 * Both provider abstractions default to their `console` implementation, which is
 * the right default for development and a silent failure in production: the
 * application boots, the request succeeds, the log records what would have
 * happened, and nothing is delivered. That is how production ended up not
 * sending any email for a while without anyone noticing.
 *
 * These are warnings rather than a refusal to start, because a deployment that
 * has not finished being configured is better off running than not.
 */
export function collectProviderWarnings({
  nodeEnv,
  config,
}: {
  nodeEnv: string;
  config: ProviderConfig;
}): string[] {
  const warnings: string[] = [];
  const isProduction = nodeEnv === 'production';

  if (isProduction && config.emailProvider === 'console') {
    warnings.push(
      'EMAIL_PROVIDER is "console" in production: no email is delivered. Newsletter confirmations, proposal links and hotel invitations are only written to this log. Set EMAIL_PROVIDER=resend.',
    );
  }

  if (config.emailProvider === 'resend' && !config.resendApiKey) {
    warnings.push(
      'EMAIL_PROVIDER is "resend" but RESEND_API_KEY is missing: every email will fail at send time.',
    );
  }

  if (config.emailProvider === 'resend' && config.emailFrom === DEFAULT_EMAIL_FROM) {
    warnings.push(
      `EMAIL_PROVIDER is "resend" but EMAIL_FROM is still the placeholder ${DEFAULT_EMAIL_FROM}: the sender is not a verified domain, so every email will be rejected at send time. Set EMAIL_FROM to an address on a domain verified with the email provider.`,
    );
  }

  if (isProduction && config.identityProvider === 'console') {
    warnings.push(
      'IDENTITY_PROVIDER is "console" in production: hotel access users are created locally but no sign-in identity is created, so those hotels can never sign in. Set IDENTITY_PROVIDER=auth0.',
    );
  }

  if (
    config.identityProvider === 'auth0' &&
    (!config.identityManagementClientId || !config.identityManagementClientSecret)
  ) {
    warnings.push(
      'IDENTITY_PROVIDER is "auth0" but the management credentials are missing: creating a hotel access user will fail. Set IDENTITY_MANAGEMENT_CLIENT_ID and IDENTITY_MANAGEMENT_CLIENT_SECRET.',
    );
  }

  if (config.identityProvider === 'auth0' && !config.identityIssuerBaseUrl) {
    warnings.push(
      'IDENTITY_PROVIDER is "auth0" but no issuer is configured. Set IDENTITY_ISSUER_BASE_URL or AUTH0_ISSUER_BASE_URL.',
    );
  }

  if (isProduction && config.hotelPortalBaseUrl === DEFAULT_HOTEL_PORTAL_BASE_URL) {
    warnings.push(
      `HOTEL_PORTAL_BASE_URL is unset in production, so it falls back to the development default ${DEFAULT_HOTEL_PORTAL_BASE_URL}. Hotels would be emailed a sign-in link that does not resolve outside a developer machine, and nothing else would look wrong. Set HOTEL_PORTAL_BASE_URL to the public portal origin.`,
    );
  }

  return warnings;
}
