import { LocalDevSeedRunner, LOCAL_DEV_SEED_RESET_SQL, getLocalDevSeedConstants } from './local-dev-seed.runner';

describe('LocalDevSeedRunner', () => {
  it('resets demo data and reseeds the expected demo catalog', async () => {
    const dataSource = { query: jest.fn() };
    const languagesRepository = { save: jest.fn() };
    const adminUsersRepository = {
      save: jest.fn().mockResolvedValue({
        id: 'ab2a0930-a58a-4864-b3e9-188db44dd73d',
        email: 'admin@example.com',
        auth0UserId: null,
      }),
    };
    const newsletterSubscribersRepository = { save: jest.fn() };
    const tagsService = { create: jest.fn() };
    const toursService = {
      create: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      update: jest.fn(),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
    };
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
        email: constants.adminEmail,
        roleName: 'super_admin',
        status: 'active',
        auth0UserId: expect.any(String),
      }),
    );
    expect(tagsService.create).toHaveBeenCalledTimes(constants.tags.length);
    expect(toursService.create).toHaveBeenCalledTimes(constants.tours.length);
    expect(toursService.update).toHaveBeenCalledTimes(constants.tours.length);
    expect(toursService.createTranslation).toHaveBeenCalledTimes(
      constants.tours.flatMap((tour) => tour.translations).length,
    );
    expect(toursService.publishTranslation).toHaveBeenCalledTimes(
      constants.tours
        .flatMap((tour) => tour.translations)
        .filter((translation) => translation.isPublished).length,
    );
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
      adminEmail: constants.adminEmail,
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
        email: getLocalDevSeedConstants().adminEmail,
        auth0UserId: 'google-oauth2|115126832227190392506',
      }),
    };
    const toursService = {
      create: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      update: jest.fn(),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
    };
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
      {
        name: 'Historic Center Highlights Catalog Entry',
        slug: 'historic-center-highlights',
        tourType: 'group',
      },
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
        email: getLocalDevSeedConstants().adminEmail,
        roleName: 'super_admin',
        status: 'active',
      }),
    );
    expect(toursService.update).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        contentSchema: expect.any(Object),
        tagKeys: expect.any(Array),
        itinerary: expect.any(Object),
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(toursService.createTranslation).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageCode: 'en',
        payload: expect.objectContaining({
          cancellationType: expect.any(String),
          highlights: expect.any(Array),
          included: expect.any(Array),
          notIncluded: expect.any(Array),
        }),
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(toursService.publishTranslation).toHaveBeenCalledWith(
      'tour-1',
      'en',
      {},
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(blogPostsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Barcelona Historic Center Guide Article',
        slug: 'barcelona-historic-center-guide',
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });
});
