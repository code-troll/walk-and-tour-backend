import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostEntity } from './blog-post.entity';
import { BlogPostsService } from './blog-posts.service';

describe('BlogPostsService', () => {
  let service: BlogPostsService;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let translationsRepository: RepositoryMock<BlogPostTranslationEntity>;
  let tagsRepository: RepositoryMock<TagEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  beforeEach(() => {
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    translationsRepository = createRepositoryMock<BlogPostTranslationEntity>();
    tagsRepository = createRepositoryMock<TagEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();

    service = new BlogPostsService(
      blogPostsRepository as never,
      translationsRepository as never,
      tagsRepository as never,
      languagesRepository as never,
    );
  });

  it('creates a published blog post with audit attribution and translations', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createBlogPostEntity());
    blogPostsRepository.create.mockImplementation((value) => value);
    blogPostsRepository.save.mockImplementation(async (value) => ({
      id: 'blog-1',
      ...value,
    }));
    tagsRepository.findBy.mockResolvedValue([
      { key: 'history', labels: { en: 'History' } },
    ] as unknown as TagEntity[]);
    languagesRepository.findBy.mockResolvedValue([{ code: 'en' }] as LanguageEntity[]);

    const result = await service.create(
      {
        name: 'Royal Copenhagen Article',
        slug: 'royal-copenhagen',
        publicationStatus: 'published',
        tagKeys: ['history'],
        translations: [
          {
            languageCode: 'en',
            publicationStatus: 'published',
            title: 'Royal Copenhagen',
            htmlContent: '<p>Hello</p>',
          },
        ],
      },
      {
        id: 'admin-1',
        email: 'admin@example.com',
        roleName: 'editor',
        status: 'active',
        auth0UserId: 'auth0|123',
      },
    );

    expect(blogPostsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Royal Copenhagen Article',
        slug: 'royal-copenhagen',
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
        publishedBy: 'admin-1',
        publishedAt: expect.any(Date),
      }),
    );
    expect(translationsRepository.save).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'blog-1' }));
  });

  it('rejects duplicate blog post slugs on create', async () => {
    blogPostsRepository.findOne.mockResolvedValue({ slug: 'royal-copenhagen' } as BlogPostEntity);

    await expect(
      service.create(
        {
          name: 'Royal Copenhagen Article',
          slug: 'royal-copenhagen',
          publicationStatus: 'draft',
        },
        {
          id: 'admin-1',
          email: 'admin@example.com',
          roleName: 'editor',
          status: 'active',
          auth0UserId: 'auth0|123',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects published translations without a title', async () => {
    blogPostsRepository.findOne.mockResolvedValue(null);
    tagsRepository.findBy.mockResolvedValue([]);
    languagesRepository.findBy.mockResolvedValue([{ code: 'en' }] as LanguageEntity[]);

    await expect(
      service.create(
        {
          name: 'Royal Copenhagen Article',
          slug: 'royal-copenhagen',
          publicationStatus: 'draft',
          translations: [
            {
              languageCode: 'en',
              publicationStatus: 'published',
              htmlContent: '<p>Hello</p>',
            },
          ],
        },
        {
          id: 'admin-1',
          email: 'admin@example.com',
          roleName: 'editor',
          status: 'active',
          auth0UserId: 'auth0|123',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate blog post slugs on update', async () => {
    blogPostsRepository.findOne
      .mockResolvedValueOnce(createBlogPostEntity())
      .mockResolvedValueOnce({ id: 'blog-2', slug: 'conflict' } as BlogPostEntity);

    await expect(
      service.update(
        'blog-1',
        { slug: 'conflict' },
        {
          id: 'admin-1',
          email: 'admin@example.com',
          roleName: 'editor',
          status: 'active',
          auth0UserId: 'auth0|123',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

function createBlogPostEntity(): BlogPostEntity {
  return {
    id: 'blog-1',
    name: 'Royal Copenhagen Article',
    slug: 'royal-copenhagen',
    heroMediaRef: null,
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
        summary: null,
        htmlContent: '<p>Hello</p>',
        seoTitle: null,
        seoDescription: null,
        imageRefs: [],
      },
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    publishedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  } as unknown as BlogPostEntity;
}
