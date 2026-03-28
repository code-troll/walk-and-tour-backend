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
    const mediaAssetsRepository = {
      save: jest.fn(async (values: Array<Record<string, unknown>>) =>
        values.map((value, index) => ({
          id: `media-${index + 1}`,
          mediaType: 'image' as const,
          storagePath: `seeded-${index + 1}.jpg`,
          contentType: 'image/jpeg',
          size: 1024,
          originalFilename: `seeded-${index + 1}.jpg`,
          createdBy: 'admin-1',
          tourUsages: [],
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          updatedAt: new Date('2026-03-14T10:00:00.000Z'),
          ...value,
        })),
      ),
    };
    const newsletterSubscribersRepository = { save: jest.fn() };
    const tagsService = { create: jest.fn() };
    const toursService = {
      create: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      update: jest.fn(),
      attachMedia: jest.fn(),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      setCoverMedia: jest.fn(),
    };
    const blogPostsService = {
      create: jest.fn().mockResolvedValue({ id: 'blog-1' }),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      setHeroMedia: jest.fn(),
    };
    const newsletterTokenService = {
      hashToken: jest.fn((token: string) => `hash:${token}`),
    };

    const runner = new LocalDevSeedRunner({
      dataSource,
      languagesRepository,
      adminUsersRepository,
      mediaAssetsRepository,
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
    expect(toursService.attachMedia).toHaveBeenCalled();
    expect(toursService.setCoverMedia).toHaveBeenCalled();
    expect(toursService.createTranslation).toHaveBeenCalledTimes(
      constants.tours.flatMap((tour) => tour.translations).length,
    );
    expect(toursService.publishTranslation).toHaveBeenCalledTimes(
      constants.tours
        .flatMap((tour) => tour.translations)
        .filter((translation) => translation.isPublished).length,
    );
    expect(blogPostsService.create).toHaveBeenCalledTimes(constants.blogPosts.length);
    expect(blogPostsService.createTranslation).toHaveBeenCalledTimes(
      constants.blogPosts.flatMap((blogPost) => blogPost.translations).length,
    );
    expect(blogPostsService.publishTranslation).toHaveBeenCalledTimes(
      constants.blogPosts
        .flatMap((blogPost) => blogPost.translations)
        .filter((translation) => translation.isPublished).length,
    );
    expect(blogPostsService.setHeroMedia).toHaveBeenCalled();
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
    const mediaAssetsRepository = {
      save: jest.fn(async (values: Array<Record<string, unknown>>) =>
        values.map((value, index) => ({
          id: `media-${index + 1}`,
          mediaType: 'image' as const,
          storagePath: `seeded-${index + 1}.jpg`,
          contentType: 'image/jpeg',
          size: 1024,
          originalFilename: `seeded-${index + 1}.jpg`,
          createdBy: 'admin-1',
          tourUsages: [],
          createdAt: new Date('2026-03-14T10:00:00.000Z'),
          updatedAt: new Date('2026-03-14T10:00:00.000Z'),
          ...value,
        })),
      ),
    };
    const toursService = {
      create: jest.fn().mockResolvedValue({ id: 'tour-1' }),
      update: jest.fn(),
      attachMedia: jest.fn(),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      setCoverMedia: jest.fn(),
    };
    const blogPostsService = {
      create: jest.fn().mockResolvedValue({ id: 'blog-1' }),
      createTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      setHeroMedia: jest.fn(),
    };

    const runner = new LocalDevSeedRunner({
      dataSource: { query: jest.fn() },
      languagesRepository: { save: jest.fn() },
      adminUsersRepository,
      mediaAssetsRepository,
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
    expect(toursService.attachMedia).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        mediaId: expect.any(String),
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(toursService.setCoverMedia).toHaveBeenCalledWith(
      'tour-1',
      {
        mediaId: expect.any(String),
      },
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(toursService.createTranslation).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageCode: 'en',
        slug: 'historic-center-highlights',
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
      {
        name: 'Barcelona Historic Center Guide Article',
        tagKeys: ['history', 'architecture', 'family-friendly'],
      },
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(blogPostsService.createTranslation).toHaveBeenCalledWith(
      'blog-1',
      expect.objectContaining({
        languageCode: 'en',
        slug: 'barcelona-historic-center-guide',
        title: 'Barcelona Historic Center Guide',
        htmlContent: expect.any(String),
      }),
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(blogPostsService.publishTranslation).toHaveBeenCalledWith(
      'blog-1',
      'en',
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
    expect(blogPostsService.setHeroMedia).toHaveBeenCalledWith(
      'blog-1',
      {
        mediaId: expect.any(String),
      },
      expect.objectContaining({
        id: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });
});
