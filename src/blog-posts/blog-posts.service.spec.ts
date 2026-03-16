import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TagEntity } from '../tags/tag.entity';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';
import { BlogPostsService } from './blog-posts.service';

describe('BlogPostsService', () => {
  let service: BlogPostsService;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let translationsRepository: RepositoryMock<BlogPostTranslationEntity>;
  let mediaAssetsRepository: RepositoryMock<MediaAssetEntity>;
  let tagsRepository: RepositoryMock<TagEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  const actor = {
    id: 'admin-1',
    email: 'admin@example.com',
    roleName: 'editor' as const,
    status: 'active' as const,
    auth0UserId: 'auth0|123',
  };

  beforeEach(() => {
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    translationsRepository = createRepositoryMock<BlogPostTranslationEntity>();
    mediaAssetsRepository = createRepositoryMock<MediaAssetEntity>();
    tagsRepository = createRepositoryMock<TagEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    service = new BlogPostsService(
      blogPostsRepository as never,
      translationsRepository as never,
      mediaAssetsRepository as never,
      tagsRepository as never,
      languagesRepository as never,
    );
  });

  it('creates a minimal blog post without publication state on the parent record', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        createBlogPostEntity({
          heroMediaId: null,
          heroMedia: null,
          tags: [{ key: 'history', labels: { en: 'History' } }] as unknown as TagEntity[],
          translations: [],
          publishedAt: null,
        }),
      );
    blogPostsRepository.create.mockImplementation((value) => value);
    blogPostsRepository.save.mockImplementation(async (value) => ({
      id: 'blog-1',
      ...value,
    }));
    tagsRepository.findBy.mockResolvedValue([
      { key: 'history', labels: { en: 'History' } },
    ] as unknown as TagEntity[]);

    const result = await service.create(
      {
        name: 'Royal Copenhagen Article',
        slug: 'royal-copenhagen',
        tagKeys: ['history'],
      },
      actor,
    );

    expect(blogPostsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Royal Copenhagen Article',
        slug: 'royal-copenhagen',
        heroMediaId: null,
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
        publishedAt: null,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'blog-1',
        tagKeys: ['history'],
        translations: {},
      }),
    );
  });

  it('creates blog translations as unpublished drafts', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [],
          publishedAt: null,
        }),
      )
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [
            createBlogPostTranslationEntity({
              languageCode: 'en',
              isPublished: false,
              title: 'Royal Copenhagen',
              htmlContent: '<p>Hello</p>',
            }),
          ],
          publishedAt: null,
        }),
      );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);
    translationsRepository.create.mockImplementation((value) => value);

    await service.createTranslation(
      'blog-1',
      {
        languageCode: 'en',
        title: 'Royal Copenhagen',
        htmlContent: '<p>Hello</p>',
      },
      actor,
    );

    expect(translationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        blogPostId: 'blog-1',
        languageCode: 'en',
        isPublished: false,
        title: 'Royal Copenhagen',
        htmlContent: '<p>Hello</p>',
        viewCount: 0,
      }),
    );
    expect(blogPostsRepository.update).toHaveBeenCalledWith(
      { id: 'blog-1' },
      { updatedBy: 'admin-1' },
    );
  });

  it('publishes a translation and updates the derived blog publishedAt timestamp', async () => {
    const publishedAt = new Date('2026-03-14T12:00:00.000Z');

    blogPostsRepository.findOne
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [
            createBlogPostTranslationEntity({
              languageCode: 'en',
              isPublished: false,
              title: 'Royal Copenhagen',
              htmlContent: '<p>Hello</p>',
            }),
          ],
          publishedAt: null,
        }),
      )
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [
            createBlogPostTranslationEntity({
              languageCode: 'en',
              isPublished: true,
              title: 'Royal Copenhagen',
              htmlContent: '<p>Hello</p>',
            }),
          ],
          publishedAt,
        }),
      );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);

    await service.publishTranslation('blog-1', 'en', actor);

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: 'en',
        isPublished: true,
      }),
    );
    expect(blogPostsRepository.update).toHaveBeenCalledWith(
      { id: 'blog-1' },
      { updatedBy: 'admin-1' },
    );
    expect(blogPostsRepository.update).toHaveBeenCalledWith(
      { id: 'blog-1' },
      { publishedAt: expect.any(Date) },
    );
  });

  it('auto-unpublishes a translation that becomes invalid and clears publishedAt when none remain published', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [
            createBlogPostTranslationEntity({
              languageCode: 'en',
              isPublished: true,
              title: 'Royal Copenhagen',
              htmlContent: '<p>Hello</p>',
            }),
          ],
          publishedAt: new Date('2026-03-14T10:00:00.000Z'),
        }),
      )
      .mockResolvedValueOnce(
        createBlogPostEntity({
          translations: [
            createBlogPostTranslationEntity({
              languageCode: 'en',
              isPublished: false,
              title: '',
              htmlContent: '',
            }),
          ],
          publishedAt: null,
        }),
      );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);
    translationsRepository.count.mockResolvedValue(0);

    await service.updateTranslation(
      'blog-1',
      'en',
      {
        title: '',
        htmlContent: '',
      },
      actor,
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: 'en',
        isPublished: false,
        title: '',
        htmlContent: '',
      }),
    );
    expect(blogPostsRepository.update).toHaveBeenCalledWith(
      { id: 'blog-1' },
      { publishedAt: null },
    );
  });

  it('rejects translation publish when the content is incomplete', async () => {
    blogPostsRepository.findOne.mockResolvedValue(
      createBlogPostEntity({
        translations: [
          createBlogPostTranslationEntity({
            languageCode: 'en',
            isPublished: false,
            title: '',
            htmlContent: '<p>Hello</p>',
          }),
        ],
        publishedAt: null,
      }),
    );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);
    translationsRepository.count.mockResolvedValue(0);

    await expect(service.publishTranslation('blog-1', 'en', actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects duplicate blog post slugs on create', async () => {
    blogPostsRepository.findOne.mockResolvedValue({ slug: 'royal-copenhagen' } as BlogPostEntity);

    await expect(
      service.create(
        {
          name: 'Royal Copenhagen Article',
          slug: 'royal-copenhagen',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate blog post slugs on update', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(createBlogPostEntity())
      .mockResolvedValueOnce({ id: 'blog-2', slug: 'conflict' } as BlogPostEntity);

    await expect(
      service.update(
        'blog-1',
        { slug: 'conflict' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

function createBlogPostEntity(overrides: Partial<BlogPostEntity> = {}): BlogPostEntity {
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
    ] as unknown as TagEntity[],
    translations: [
      createBlogPostTranslationEntity({
        languageCode: 'en',
        isPublished: true,
        title: 'Royal Copenhagen',
        summary: null,
        htmlContent: '<p>Hello</p>',
        seoTitle: null,
        seoDescription: null,
        imageRefs: [],
      }),
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
    ...overrides,
  } as unknown as BlogPostEntity;
}

function createBlogPostTranslationEntity(
  overrides: Partial<BlogPostTranslationEntity> = {},
): BlogPostTranslationEntity {
  return {
    id: 'translation-1',
    blogPostId: 'blog-1',
    languageCode: 'en',
    isPublished: true,
    title: 'Royal Copenhagen',
    summary: null,
    htmlContent: '<p>Hello</p>',
    seoTitle: null,
    seoDescription: null,
    imageRefs: [],
    viewCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as BlogPostTranslationEntity;
}

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'blog/hero.jpg',
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
