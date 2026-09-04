export interface ProviderConfig {
  appBaseUrl: string;
  publicSiteBaseUrl: string;
  newsletterPublicAppBaseUrl?: string;
  emailProvider: 'console' | 'resend';
  emailFrom: string;
  resendApiKey?: string;
  storageDriver: 'local' | 'railway';
  localStorageRoot: string;
  localStoragePublicBaseUrl: string;
  railwayStorageEndpoint?: string;
  railwayStorageAccessKeyId?: string;
  railwayStorageSecretAccessKey?: string;
  railwayStorageRegion: string;
  railwayStorageBucket?: string;
  railwayStorageUrlStyle: 'virtual-hosted' | 'path';
  defaultEventTimezone: string;
  identityProvider: 'console' | 'auth0';
  identityIssuerBaseUrl: string;
  identityManagementClientId?: string;
  identityManagementClientSecret?: string;
  hotelIdentityConnection: string;
  hotelPortalBaseUrl: string;
}

const DEFAULT_APP_BASE_URL = 'http://api.dev.walkandtour.dk:3000';
const DEFAULT_PUBLIC_SITE_BASE_URL = 'https://walkandtour.dk';
const DEFAULT_NEWSLETTER_PUBLIC_APP_BASE_URL = 'http://dev.walkandtour.dk:3001';
const DEFAULT_EMAIL_PROVIDER = 'console';
/** Exported so the startup warnings can tell a configured sender from this placeholder. */
export const DEFAULT_EMAIL_FROM = 'Walk and Tour <no-reply@example.com>';
const DEFAULT_STORAGE_DRIVER = 'local';
const DEFAULT_LOCAL_STORAGE_ROOT = 'storage';
const DEFAULT_LOCAL_STORAGE_PUBLIC_BASE_URL = 'http://api.dev.walkandtour.dk:3000/media';
const DEFAULT_RAILWAY_STORAGE_REGION = 'auto';
const DEFAULT_RAILWAY_STORAGE_URL_STYLE = 'virtual-hosted';
// IANA timezone applied to new events when the admin does not specify one. All
// event datetimes are still stored in UTC; this only records the "home" zone a
// calendar UI should present the event in. See EVENTS/timezone handling.
const DEFAULT_EVENT_TIMEZONE = 'Europe/Copenhagen';
const DEFAULT_IDENTITY_PROVIDER = 'console';
const DEFAULT_HOTEL_IDENTITY_CONNECTION = 'Hotel-Portal-Users';
/** Exported so the startup warnings can spot a production deploy still pointing at dev. */
export const DEFAULT_HOTEL_PORTAL_BASE_URL = 'http://hotels.dev.walkandtour.dk:3001';

export function getProviderConfig(): ProviderConfig {
  return {
    appBaseUrl: process.env.APP_BASE_URL ?? DEFAULT_APP_BASE_URL,
    publicSiteBaseUrl: process.env.PUBLIC_SITE_BASE_URL ?? DEFAULT_PUBLIC_SITE_BASE_URL,
    newsletterPublicAppBaseUrl:
      process.env.NEWSLETTER_PUBLIC_APP_BASE_URL ??
      process.env.APP_BASE_URL ??
      DEFAULT_NEWSLETTER_PUBLIC_APP_BASE_URL,
    emailProvider: parseEmailProvider(process.env.EMAIL_PROVIDER),
    emailFrom: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
    resendApiKey: process.env.RESEND_API_KEY,
    storageDriver: parseStorageDriver(process.env.STORAGE_DRIVER),
    localStorageRoot: process.env.LOCAL_STORAGE_ROOT ?? DEFAULT_LOCAL_STORAGE_ROOT,
    localStoragePublicBaseUrl:
      process.env.LOCAL_STORAGE_PUBLIC_BASE_URL ?? DEFAULT_LOCAL_STORAGE_PUBLIC_BASE_URL,
    railwayStorageEndpoint: process.env.RAILWAY_STORAGE_ENDPOINT,
    railwayStorageAccessKeyId: process.env.RAILWAY_STORAGE_ACCESS_KEY_ID,
    railwayStorageSecretAccessKey: process.env.RAILWAY_STORAGE_SECRET_ACCESS_KEY,
    railwayStorageRegion:
      process.env.RAILWAY_STORAGE_REGION ?? DEFAULT_RAILWAY_STORAGE_REGION,
    railwayStorageBucket: process.env.RAILWAY_STORAGE_BUCKET,
    railwayStorageUrlStyle: parseRailwayStorageUrlStyle(
      process.env.RAILWAY_STORAGE_URL_STYLE,
    ),
    defaultEventTimezone:
      process.env.DEFAULT_EVENT_TIMEZONE ?? DEFAULT_EVENT_TIMEZONE,
    identityProvider: parseIdentityProvider(process.env.IDENTITY_PROVIDER),
    identityIssuerBaseUrl:
      process.env.IDENTITY_ISSUER_BASE_URL ?? process.env.AUTH0_ISSUER_BASE_URL ?? '',
    identityManagementClientId: process.env.IDENTITY_MANAGEMENT_CLIENT_ID,
    identityManagementClientSecret: process.env.IDENTITY_MANAGEMENT_CLIENT_SECRET,
    hotelIdentityConnection:
      process.env.HOTEL_IDENTITY_CONNECTION ?? DEFAULT_HOTEL_IDENTITY_CONNECTION,
    hotelPortalBaseUrl:
      process.env.HOTEL_PORTAL_BASE_URL ?? DEFAULT_HOTEL_PORTAL_BASE_URL,
  };
}

function parseIdentityProvider(
  value: string | undefined,
): ProviderConfig['identityProvider'] {
  return value === 'auth0' ? 'auth0' : DEFAULT_IDENTITY_PROVIDER;
}

function parseEmailProvider(value: string | undefined): ProviderConfig['emailProvider'] {
  return value === 'resend' ? 'resend' : DEFAULT_EMAIL_PROVIDER;
}

function parseStorageDriver(value: string | undefined): ProviderConfig['storageDriver'] {
  return value === 'railway' ? 'railway' : DEFAULT_STORAGE_DRIVER;
}

function parseRailwayStorageUrlStyle(
  value: string | undefined,
): ProviderConfig['railwayStorageUrlStyle'] {
  return value === 'path' ? 'path' : DEFAULT_RAILWAY_STORAGE_URL_STYLE;
}
