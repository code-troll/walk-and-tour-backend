import { NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { StorageService } from '../storage/storage-service.interface';
import { BlogPostViewEntity } from './blog-post-view.entity';
import { BlogPostEntity } from './blog-post.entity';
import { PublicBlogPostsService } from './public-blog-posts.service';

describe('PublicBlogPostsService', () => {
  let service: PublicBlogPostsService;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let blogPostViewsRepository: RepositoryMock<BlogPostViewEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    blogPostViewsRepository = createRepositoryMock<BlogPostViewEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    storageService = {
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn((path: string) => `http://localhost:3000/media/${path}`),
    };
    service = new PublicBlogPostsService(
      blogPostsRepository as never,
      blogPostViewsRepository as never,
      languagesRepository as never,
      storageService,
    );
  });

  it('filters the public list to published blog posts in the requested locale', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    blogPostsRepository.find.mockResolvedValue([
      createPublicBlogPost(),
      createPublicBlogPost({
        slug: 'draft-post',
        translations: [
          {
            languageCode: 'en',
            isPublished: false,
            title: 'Draft post',
            summary: null,
            htmlContent: '<p>Draft</p>',
            seoTitle: null,
            seoDescription: null,
            imageRefs: [],
          },
        ] as unknown as BlogPostEntity['translations'],
      }),
    ] as BlogPostEntity[]);

    await expect(service.findAll('en')).resolves.toEqual([
      expect.objectContaining({
        slug: 'royal-copenhagen',
        heroMedia: expect.objectContaining({
          id: 'media-1',
          contentUrl:
            'http://api.dev.walkandtour.dk:3000/api/public/blog-posts/royal-copenhagen/media/media-1',
        }),
        translation: expect.objectContaining({
          locale: 'en',
          viewCount: 7,
        }),
      }),
    ]);
  });

  it('increments the public view count when the detail request counts as a new view', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    blogPostsRepository.findOne.mockResolvedValue(createPublicBlogPost());
    blogPostViewsRepository.manager.query
      .mockResolvedValueOnce([{ blog_post_translation_id: 'translation-1' }])
      .mockResolvedValueOnce(undefined);

    await expect(
      service.findOneBySlug('royal-copenhagen', 'en', createRequestContext()),
    ).resolves.toEqual(
      expect.objectContaining({
        slug: 'royal-copenhagen',
        translation: expect.objectContaining({
          locale: 'en',
          viewCount: 8,
        }),
      }),
    );

    expect(blogPostViewsRepository.manager.transaction).toHaveBeenCalled();
    expect(blogPostViewsRepository.manager.query).toHaveBeenCalledTimes(2);
  });

  it('does not increment the public view count again within the deduplication window', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    blogPostsRepository.findOne.mockResolvedValue(createPublicBlogPost());
    blogPostViewsRepository.manager.query.mockResolvedValueOnce([]);

    await expect(
      service.findOneBySlug('royal-copenhagen', 'en', createRequestContext()),
    ).resolves.toEqual(
      expect.objectContaining({
        slug: 'royal-copenhagen',
        translation: expect.objectContaining({
          locale: 'en',
          viewCount: 7,
        }),
      }),
    );

    expect(blogPostViewsRepository.manager.query).toHaveBeenCalledTimes(1);
  });

  it('rejects unavailable locales', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.findAll('fr')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects blog posts that are not public in the requested locale without counting a view', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    blogPostsRepository.findOne.mockResolvedValue(
      createPublicBlogPost({
        translations: [
          {
            languageCode: 'en',
            isPublished: false,
            title: 'Royal Copenhagen',
            summary: null,
            htmlContent: '<p>Hello</p>',
            seoTitle: null,
            seoDescription: null,
            imageRefs: [],
          },
        ] as unknown as BlogPostEntity['translations'],
      }) as BlogPostEntity,
    );

    await expect(
      service.findOneBySlug('royal-copenhagen', 'en', createRequestContext()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(blogPostViewsRepository.manager.transaction).not.toHaveBeenCalled();
  });
});

function createPublicBlogPost(overrides: Partial<BlogPostEntity> = {}): BlogPostEntity {
  return {
    id: 'blog-1',
    name: 'Royal Copenhagen Article',
    slug: 'royal-copenhagen',
    heroMediaId: 'media-1',
    heroMedia: createMediaAssetEntity(),
    tags: [
      {
        key: 'history',
        labels: { en: 'History' },
      },
    ],
    translations: [
      {
        id: 'translation-1',
        blogPostId: 'blog-1',
        languageCode: 'en',
        isPublished: true,
        title: 'Royal Copenhagen',
        summary: 'Summary',
        htmlContent: '<p>Hello</p>',
        seoTitle: null,
        seoDescription: null,
        imageRefs: [],
        viewCount: 7,
      },
    ],
    publishedAt: new Date(),
    ...overrides,
  } as unknown as BlogPostEntity;
}

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'hero.jpg',
    contentType: 'image/jpeg',
    size: 1024,
    originalFilename: 'hero.jpg',
    createdBy: 'admin-1',
    tourUsages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MediaAssetEntity;
}

function createRequestContext() {
  return {
    headers: {
      'x-forwarded-for': '203.0.113.10, 198.51.100.5',
    },
    ip: '198.51.100.5',
    socket: {
      remoteAddress: '198.51.100.5',
    },
  };
}
