import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

import { BlogPostsController } from './blog-posts.controller';
import { BlogPostsService } from './blog-posts.service';
import { PublicBlogPostsService } from './public-blog-posts.service';

describe('BlogPostsController', () => {
  let controller: BlogPostsController;
  let blogPostsService: jest.Mocked<BlogPostsService>;
  let publicBlogPostsService: jest.Mocked<PublicBlogPostsService>;

  beforeEach(() => {
    blogPostsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      listMedia: jest.fn(),
      setHeroMedia: jest.fn(),
      clearHeroMedia: jest.fn(),
    } as unknown as jest.Mocked<BlogPostsService>;
    publicBlogPostsService = {
      findAll: jest.fn(),
      findOneBySlug: jest.fn(),
      getMediaContent: jest.fn().mockResolvedValue({
        content: Buffer.from('content'),
        contentType: 'image/jpeg',
        originalFilename: 'hero.jpg',
      }),
    } as unknown as jest.Mocked<PublicBlogPostsService>;

    controller = new BlogPostsController(blogPostsService, publicBlogPostsService);
  });

  it('delegates admin create calls with the authenticated admin', async () => {
    const dto = {
      name: 'Royal Copenhagen Article',
      slug: 'royal-copenhagen',
      publicationStatus: 'draft',
    };
    const admin = { id: 'admin-1' };

    await controller.createAdmin(dto as never, admin as never);

    expect(blogPostsService.create).toHaveBeenCalledWith(dto, admin);
  });

  it('delegates public blog listing by locale', async () => {
    await controller.findAllPublic({ locale: 'en' });

    expect(publicBlogPostsService.findAll).toHaveBeenCalledWith('en');
  });

  it('delegates public blog detail by slug and locale', async () => {
    await controller.findOnePublic('royal-copenhagen', { locale: 'en' });

    expect(publicBlogPostsService.findOneBySlug).toHaveBeenCalledWith(
      'royal-copenhagen',
      'en',
    );
  });

  it('delegates blog media listing', async () => {
    await controller.listAdminMedia('2b3d8afb-4083-49ec-8990-c71ff89c71eb');

    expect(blogPostsService.listMedia).toHaveBeenCalledWith(
      '2b3d8afb-4083-49ec-8990-c71ff89c71eb',
    );
  });

  it('delegates hero media assignment', async () => {
    const dto = { mediaId: '0c44eca6-8a10-49ad-a3a3-60dcdde3760a' };
    const admin = { id: 'admin-1' };

    await controller.setHeroMedia(
      '2b3d8afb-4083-49ec-8990-c71ff89c71eb',
      dto as never,
      admin as never,
    );

    expect(blogPostsService.setHeroMedia).toHaveBeenCalledWith(
      '2b3d8afb-4083-49ec-8990-c71ff89c71eb',
      dto,
      admin,
    );
  });

  it('delegates hero media clearing', async () => {
    const admin = { id: 'admin-1' };

    await controller.clearHeroMedia(
      '2b3d8afb-4083-49ec-8990-c71ff89c71eb',
      admin as never,
    );

    expect(blogPostsService.clearHeroMedia).toHaveBeenCalledWith(
      '2b3d8afb-4083-49ec-8990-c71ff89c71eb',
      admin,
    );
  });

  it('delegates public blog media fetch by slug and media id', async () => {
    const response = {
      setHeader: jest.fn(),
    };

    await controller.getPublicMedia(
      'royal-copenhagen',
      '0c44eca6-8a10-49ad-a3a3-60dcdde3760a',
      response as never,
    );

    expect(publicBlogPostsService.getMediaContent).toHaveBeenCalledWith(
      'royal-copenhagen',
      '0c44eca6-8a10-49ad-a3a3-60dcdde3760a',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
  });

  it('marks hero media clear requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        BlogPostsController.prototype.clearHeroMedia,
      ),
    ).toBe(204);
  });
});
