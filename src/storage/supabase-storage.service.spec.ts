import { SupabaseStorageService } from './supabase-storage.service';

describe('SupabaseStorageService', () => {
  it('uploads objects through the Supabase storage API', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });

    const service = new SupabaseStorageService(
      {
        appBaseUrl: 'https://backend.example.com',
        emailProvider: 'console',
        emailFrom: 'Walk and Tour <no-reply@example.com>',
        storageDriver: 'supabase',
        localStorageRoot: 'storage',
        localStoragePublicBaseUrl: 'https://backend.example.com/media',
        supabaseUrl: 'https://project.supabase.co',
        supabaseServiceRoleKey: 'service-role-key',
        supabaseBucket: 'media',
      },
      fetchImpl,
    );

    const result = await service.putObject({
      path: 'images/cover.jpg',
      content: Buffer.from('hello'),
      contentType: 'image/jpeg',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/media/images/cover.jpg',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer service-role-key',
          apikey: 'service-role-key',
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        }),
      }),
    );
    expect(result.publicUrl).toBe(
      'https://project.supabase.co/storage/v1/object/public/media/images/cover.jpg',
    );
  });
});
