import { getAppConfig } from './app.config';

describe('getAppConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.APP_NAME;
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.MEDIA_IMAGE_MAX_UPLOAD_BYTES;
    delete process.env.MEDIA_VIDEO_MAX_UPLOAD_BYTES;
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
      mediaImageMaxUploadBytes: 10 * 1024 * 1024,
      mediaVideoMaxUploadBytes: 100 * 1024 * 1024,
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

  it('parses explicit media upload limits', () => {
    process.env.MEDIA_IMAGE_MAX_UPLOAD_BYTES = '2048';
    process.env.MEDIA_VIDEO_MAX_UPLOAD_BYTES = '4096';

    expect(getAppConfig()).toEqual(
      expect.objectContaining({
        mediaImageMaxUploadBytes: 2048,
        mediaVideoMaxUploadBytes: 4096,
      }),
    );
  });
});
