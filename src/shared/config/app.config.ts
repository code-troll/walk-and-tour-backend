export interface AppConfig {
  appName: string;
  corsAllowedOrigins: string[];
  nodeEnv: string;
  port: number;
}

const DEFAULT_APP_NAME = 'walk-and-tour-backend';
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_PORT = 3000;

export function getAppConfig(): AppConfig {
  return {
    appName: process.env.APP_NAME ?? DEFAULT_APP_NAME,
    corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
    nodeEnv: process.env.NODE_ENV ?? DEFAULT_NODE_ENV,
    port: parsePort(process.env.PORT),
  };
}

function parseCorsAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
}
