export interface AppConfig {
  appName: string;
  corsAllowedOrigins: string[];
  mediaImageMaxUploadBytes: number;
  mediaVideoMaxUploadBytes: number;
  nodeEnv: string;
  port: number;
}

const DEFAULT_APP_NAME = 'walk-and-tour-backend';
const DEFAULT_MEDIA_IMAGE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_MEDIA_VIDEO_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_PORT = 3000;

export function getAppConfig(): AppConfig {
  return {
    appName: process.env.APP_NAME ?? DEFAULT_APP_NAME,
    corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
    mediaImageMaxUploadBytes: parsePositiveInt(
      process.env.MEDIA_IMAGE_MAX_UPLOAD_BYTES,
      DEFAULT_MEDIA_IMAGE_MAX_UPLOAD_BYTES,
    ),
    mediaVideoMaxUploadBytes: parsePositiveInt(
      process.env.MEDIA_VIDEO_MAX_UPLOAD_BYTES,
      DEFAULT_MEDIA_VIDEO_MAX_UPLOAD_BYTES,
    ),
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
  return parsePositiveInt(value, DEFAULT_PORT);
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
