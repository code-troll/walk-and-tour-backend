import { LocalDevSeedRunner, LOCAL_DEV_SEED_RESET_SQL, getLocalDevSeedConstants } from './local-dev-seed.runner';

describe('LocalDevSeedRunner', () => {
  it('resets demo data and reseeds the expected demo catalog', async () => {
    const dataSource = { query: jest.fn() };
    const languagesRepository = { save: jest.fn() };
    const adminUsersRepository = {
      save: jest.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@example.com',
        auth0UserId: null,
      }),
    };
    const newsletterSubscribersRepository = { save: jest.fn() };
    const tagsService = { create: jest.fn() };
    const toursService = { create: jest.fn() };
    const blogPostsService = { create: jest.fn() };
    const newsletterTokenService = {
      hashToken: jest.fn((token: string) => `hash:${token}`),
    };

    const runner = new LocalDevSeedRunner({
      dataSource,
      languagesRepository,
      adminUsersRepository,
      newsletterSubscribersRepository,
      tagsService,
      toursService,
      blogPostsService,
      newsletterTokenService,
    });

    const summary = await runner.run();
    const constants = getLocalDevSeedConstants();

    expect(dataSource.query).toHaveBeenCalledWith(LOCAL_DEV_SEED_RESET_SQL);
    expect(languagesRepository.save).toHaveBeenCalledWith([
      { code: 'en', name: 'English', isEnabled: true, sortOrder: 1 },
      { code: 'es', name: 'Spanish', isEnabled: true, sortOrder: 2 },
      { code: 'it', name: 'Italian', isEnabled: true, sortOrder: 3 },
    ]);
    expect(adminUsersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'admin@example.com',
        roleName: 'super_admin',
        status: 'active',
        auth0UserId: null,
      }),
    );
    expect(tagsService.create).toHaveBeenCalledTimes(constants.tags.length);
    expect(toursService.create).toHaveBeenCalledTimes(constants.tours.length);
    expect(blogPostsService.create).toHaveBeenCalledTimes(constants.blogPosts.length);
    expect(newsletterSubscribersRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'pending.confirmation@example.com',
          subscriptionStatus: 'pending_confirmation',
          confirmationTokenHash:
            'hash:111111111111111111111111111111111111111111111111',
        }),
        expect.objectContaining({
          email: 'former.subscriber@example.com',
          subscriptionStatus: 'unsubscribed',
          unsubscribeTokenHash:
            'hash:333333333333333333333333333333333333333333333333',
        }),
      ]),
    );
    expect(summary).toEqual({
      adminEmail: 'admin@example.com',
      tags: constants.tags.length,
      tours: constants.tours.length,
      blogPosts: constants.blogPosts.length,
      newsletterSubscribers: constants.newsletterSubscribers.length,
      pendingConfirmationToken:
        '111111111111111111111111111111111111111111111111',
      activeUnsubscribeToken:
        '222222222222222222222222222222222222222222222222',
      unsubscribedToken:
        '333333333333333333333333333333333333333333333333',
    });
  });

  it('creates tours and blog posts with the seeded admin actor', async () => {
    const adminUsersRepository = {
      save: jest.fn().mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@example.com',
        auth0UserId: null,
      }),
    };
    const toursService = { create: jest.fn() };
    const blogPostsService = { create: jest.fn() };

    const runner = new LocalDevSeedRunner({
      dataSource: { query: jest.fn() },
      languagesRepository: { save: jest.fn() },
      adminUsersRepository,
      newsletterSubscribersRepository: { save: jest.fn() },
      tagsService: { create: jest.fn() },
      toursService,
      blogPostsService,
      newsletterTokenService: { hashToken: jest.fn((token: string) => token) },
    });

    await runner.run();

    expect(toursService.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'historic-center-highlights' }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@example.com',
        roleName: 'super_admin',
        status: 'active',
      }),
    );
    expect(blogPostsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'barcelona-historic-center-guide',
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });
});
