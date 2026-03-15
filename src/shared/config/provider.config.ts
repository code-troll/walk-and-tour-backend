export interface ProviderConfig {
  appBaseUrl: string;
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
}

const DEFAULT_APP_BASE_URL = 'http://localhost:3000';
const DEFAULT_EMAIL_PROVIDER = 'console';
const DEFAULT_EMAIL_FROM = 'Walk and Tour <no-reply@example.com>';
const DEFAULT_STORAGE_DRIVER = 'local';
const DEFAULT_LOCAL_STORAGE_ROOT = 'storage';
const DEFAULT_LOCAL_STORAGE_PUBLIC_BASE_URL = 'http://localhost:3000/media';
const DEFAULT_RAILWAY_STORAGE_REGION = 'auto';
const DEFAULT_RAILWAY_STORAGE_URL_STYLE = 'virtual-hosted';

export function getProviderConfig(): ProviderConfig {
  return {
    appBaseUrl: process.env.APP_BASE_URL ?? DEFAULT_APP_BASE_URL,
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
  };
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
