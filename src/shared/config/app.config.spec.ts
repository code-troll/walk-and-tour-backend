import { getAppConfig } from './app.config';

describe('getAppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APP_NAME;
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.NODE_ENV;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env is unset', () => {
    expect(getAppConfig()).toEqual({
      appName: 'walk-and-tour-backend',
      corsAllowedOrigins: [],
      nodeEnv: 'development',
      port: 3000,
    });
  });

  it('parses comma-separated cors origins', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      'http://admin.dev.walkandtour.dk:3001, http://localhost:3001 ,';

    expect(getAppConfig().corsAllowedOrigins).toEqual([
      'http://admin.dev.walkandtour.dk:3001',
      'http://localhost:3001',
    ]);
  });
});
