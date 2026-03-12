export interface ProviderConfig {
  appBaseUrl: string;
  emailProvider: 'console' | 'resend';
  emailFrom: string;
  resendApiKey?: string;
  storageDriver: 'local' | 'supabase';
  localStorageRoot: string;
  localStoragePublicBaseUrl: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseBucket: string;
}

const DEFAULT_APP_BASE_URL = 'http://localhost:3000';
const DEFAULT_EMAIL_PROVIDER = 'console';
const DEFAULT_EMAIL_FROM = 'Walk and Tour <no-reply@example.com>';
const DEFAULT_STORAGE_DRIVER = 'local';
const DEFAULT_LOCAL_STORAGE_ROOT = 'storage';
const DEFAULT_LOCAL_STORAGE_PUBLIC_BASE_URL = 'http://localhost:3000/media';
const DEFAULT_SUPABASE_BUCKET = 'media';

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
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabaseBucket: process.env.SUPABASE_BUCKET ?? DEFAULT_SUPABASE_BUCKET,
  };
}

function parseEmailProvider(value: string | undefined): ProviderConfig['emailProvider'] {
  return value === 'resend' ? 'resend' : DEFAULT_EMAIL_PROVIDER;
}

function parseStorageDriver(value: string | undefined): ProviderConfig['storageDriver'] {
  return value === 'supabase' ? 'supabase' : DEFAULT_STORAGE_DRIVER;
}
