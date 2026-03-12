export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USERNAME = 'postgres';
const DEFAULT_DB_PASSWORD = 'postgres';
const DEFAULT_DB_NAME = 'walk_and_tour';

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST ?? DEFAULT_DB_HOST,
    port: parsePort(process.env.DB_PORT),
    username: process.env.DB_USER ?? DEFAULT_DB_USERNAME,
    password: process.env.DB_PASSWORD ?? DEFAULT_DB_PASSWORD,
    database: process.env.DB_NAME ?? DEFAULT_DB_NAME,
  };
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_DB_PORT;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_DB_PORT;
  }

  return parsed;
}
