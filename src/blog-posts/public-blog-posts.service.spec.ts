import { NotFoundException } from '@nestjs/common';

import { LanguageEntity } from '../languages/language.entity';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { BlogPostEntity } from './blog-post.entity';
import { PublicBlogPostsService } from './public-blog-posts.service';

describe('PublicBlogPostsService', () => {
  let service: PublicBlogPostsService;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  beforeEach(() => {
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    service = new PublicBlogPostsService(
      blogPostsRepository as never,
      languagesRepository as never,
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
    heroMediaRef: 'hero.jpg',
    category: 'history',
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
