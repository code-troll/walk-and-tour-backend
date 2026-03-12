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
    } as unknown as jest.Mocked<BlogPostsService>;
    publicBlogPostsService = {
      findAll: jest.fn(),
      findOneBySlug: jest.fn(),
    } as unknown as jest.Mocked<PublicBlogPostsService>;

    controller = new BlogPostsController(blogPostsService, publicBlogPostsService);
  });

  it('delegates admin create calls with the authenticated admin', async () => {
    const dto = { slug: 'royal-copenhagen', publicationStatus: 'draft' };
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
});
