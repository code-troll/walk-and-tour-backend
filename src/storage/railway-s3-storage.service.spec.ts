import { RailwayS3StorageService } from './railway-s3-storage.service';

describe('RailwayS3StorageService', () => {
  it('uploads objects through the Railway S3 API using virtual-hosted urls', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });

    const service = new RailwayS3StorageService(
      {
        appBaseUrl: 'https://backend.example.com',
        emailProvider: 'console',
        emailFrom: 'Walk and Tour <no-reply@example.com>',
        storageDriver: 'railway',
        localStorageRoot: 'storage',
        localStoragePublicBaseUrl: 'https://backend.example.com/media',
        railwayStorageEndpoint: 'https://storage.example.com',
        railwayStorageAccessKeyId: 'access-key-id',
        railwayStorageSecretAccessKey: 'secret-access-key',
        railwayStorageRegion: 'auto',
        railwayStorageBucket: 'media',
        railwayStorageUrlStyle: 'virtual-hosted',
      },
      fetchImpl,
      () => new Date('2026-03-15T12:34:56.000Z'),
    );

    const result = await service.putObject({
      path: 'images/cover.jpg',
      content: Buffer.from('hello'),
      contentType: 'image/jpeg',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://media.storage.example.com/images/cover.jpg',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          host: 'media.storage.example.com',
          'x-amz-date': '20260315T123456Z',
          'x-amz-content-sha256':
            '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
          'Content-Type': 'image/jpeg',
          Authorization: expect.stringContaining(
            'Credential=access-key-id/20260315/auto/s3/aws4_request',
          ),
        }),
      }),
    );
    expect(result.publicUrl).toBe('https://media.storage.example.com/images/cover.jpg');
  });

  it('builds path-style urls when configured', () => {
    const service = new RailwayS3StorageService({
      appBaseUrl: 'https://backend.example.com',
      emailProvider: 'console',
      emailFrom: 'Walk and Tour <no-reply@example.com>',
      storageDriver: 'railway',
      localStorageRoot: 'storage',
      localStoragePublicBaseUrl: 'https://backend.example.com/media',
      railwayStorageEndpoint: 'https://storage.example.com/root',
      railwayStorageAccessKeyId: 'access-key-id',
      railwayStorageSecretAccessKey: 'secret-access-key',
      railwayStorageRegion: 'eu-west-1',
      railwayStorageBucket: 'media',
      railwayStorageUrlStyle: 'path',
    });

    expect(service.getPublicUrl('images/cover photo.jpg')).toBe(
      'https://storage.example.com/root/media/images/cover%20photo.jpg',
    );
  });

  it('fails when Railway storage configuration is missing', async () => {
    const service = new RailwayS3StorageService({
      appBaseUrl: 'https://backend.example.com',
      emailProvider: 'console',
      emailFrom: 'Walk and Tour <no-reply@example.com>',
      storageDriver: 'railway',
      localStorageRoot: 'storage',
      localStoragePublicBaseUrl: 'https://backend.example.com/media',
      railwayStorageRegion: 'auto',
      railwayStorageUrlStyle: 'virtual-hosted',
    });

    await expect(
      service.putObject({
        path: 'images/cover.jpg',
        content: Buffer.from('hello'),
        contentType: 'image/jpeg',
      }),
    ).rejects.toThrow(
      'RAILWAY_STORAGE_ENDPOINT, RAILWAY_STORAGE_ACCESS_KEY_ID, RAILWAY_STORAGE_SECRET_ACCESS_KEY, and RAILWAY_STORAGE_BUCKET are required when STORAGE_DRIVER=railway.',
    );
  });
});
