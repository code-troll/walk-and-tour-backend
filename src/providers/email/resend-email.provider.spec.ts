import { ResendEmailProvider } from './resend-email.provider';

describe('ResendEmailProvider', () => {
  it('sends a newsletter confirmation email through the Resend API', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });

    const provider = new ResendEmailProvider(
      {
        appBaseUrl: 'https://backend.example.com',
        emailProvider: 'resend',
        emailFrom: 'Walk and Tour <no-reply@example.com>',
        resendApiKey: 'resend-key',
        storageDriver: 'local',
        localStorageRoot: 'storage',
        localStoragePublicBaseUrl: 'https://backend.example.com/media',
        railwayStorageRegion: 'auto',
        railwayStorageUrlStyle: 'virtual-hosted',
      },
      fetchImpl,
    );

    await provider.sendNewsletterConfirmation({
      recipientEmail: 'subscriber@example.com',
      confirmationUrl: 'https://backend.example.com/confirm?token=abc',
      unsubscribeUrl: 'https://backend.example.com/unsubscribe?token=def',
      preferredLocale: 'en',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).toEqual(
      expect.objectContaining({
        from: 'Walk and Tour <no-reply@example.com>',
        to: ['subscriber@example.com'],
        subject: 'Confirm your Walk and Tour newsletter subscription',
      }),
    );
  });

  it('fails when the resend api key is missing', async () => {
    const provider = new ResendEmailProvider({
      appBaseUrl: 'https://backend.example.com',
      emailProvider: 'resend',
      emailFrom: 'Walk and Tour <no-reply@example.com>',
      storageDriver: 'local',
      localStorageRoot: 'storage',
      localStoragePublicBaseUrl: 'https://backend.example.com/media',
      railwayStorageRegion: 'auto',
      railwayStorageUrlStyle: 'virtual-hosted',
    });

    await expect(
      provider.sendNewsletterConfirmation({
        recipientEmail: 'subscriber@example.com',
        confirmationUrl: 'https://backend.example.com/confirm?token=abc',
        unsubscribeUrl: 'https://backend.example.com/unsubscribe?token=def',
      }),
    ).rejects.toThrow('RESEND_API_KEY is required');
  });
});
