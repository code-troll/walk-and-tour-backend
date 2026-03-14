import { NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { StorageService } from '../storage/storage-service.interface';
import { BlogPostEntity } from './blog-post.entity';
import { PublicBlogPostsService } from './public-blog-posts.service';

describe('PublicBlogPostsService', () => {
  let service: PublicBlogPostsService;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    storageService = {
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn((path: string) => `http://localhost:3000/media/${path}`),
    };
    service = new PublicBlogPostsService(
      blogPostsRepository as never,
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
        publicationStatus: 'draft',
      }),
    ] as BlogPostEntity[]);

    await expect(service.findAll('en')).resolves.toEqual([
      expect.objectContaining({
        slug: 'royal-copenhagen',
        heroMedia: expect.objectContaining({
          id: 'media-1',
          contentUrl: 'http://localhost:3000/api/public/blog-posts/royal-copenhagen/media/media-1',
        }),
        translation: expect.objectContaining({
          locale: 'en',
        }),
      }),
    ]);
  });

  it('rejects unavailable locales', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.findAll('fr')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects blog posts that are not public in the requested locale', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    blogPostsRepository.findOne.mockResolvedValue(
      createPublicBlogPost({
        translations: [
          {
            languageCode: 'en',
            publicationStatus: 'unpublished',
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

    await expect(service.findOneBySlug('royal-copenhagen', 'en')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createPublicBlogPost(overrides: Partial<BlogPostEntity> = {}): BlogPostEntity {
  return {
    id: 'blog-1',
    name: 'Royal Copenhagen Article',
    slug: 'royal-copenhagen',
    heroMediaId: 'media-1',
    heroMedia: createMediaAssetEntity(),
    publicationStatus: 'published',
    tags: [
      {
        key: 'history',
        labels: { en: 'History' },
      },
    ],
    translations: [
      {
        languageCode: 'en',
        publicationStatus: 'published',
        title: 'Royal Copenhagen',
        summary: 'Summary',
        htmlContent: '<p>Hello</p>',
        seoTitle: null,
        seoDescription: null,
        imageRefs: [],
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
