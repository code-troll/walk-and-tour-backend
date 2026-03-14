import { PublicToursController } from './public-tours.controller';
import { PublicToursService } from './public-tours.service';

describe('PublicToursController', () => {
  let controller: PublicToursController;
  let publicToursService: jest.Mocked<PublicToursService>;

  beforeEach(() => {
    publicToursService = {
      findAll: jest.fn(),
      findOneBySlug: jest.fn(),
      getMediaContent: jest.fn().mockResolvedValue({
        content: Buffer.from('content'),
        contentType: 'image/jpeg',
        originalFilename: 'cover.jpg',
      }),
    } as unknown as jest.Mocked<PublicToursService>;

    controller = new PublicToursController(publicToursService);
  });

  it('delegates public tour listing by locale', async () => {
    await controller.findAll({ locale: 'en' });

    expect(publicToursService.findAll).toHaveBeenCalledWith('en');
  });

  it('delegates public tour detail by slug and locale', async () => {
    await controller.findOne('historic-center', { locale: 'en' });

    expect(publicToursService.findOneBySlug).toHaveBeenCalledWith(
      'historic-center',
      'en',
    );
  });

  it('delegates public tour media fetch by slug and media id', async () => {
    const response = {
      setHeader: jest.fn(),
    };

    await controller.getMediaContent(
      'historic-center',
      'f5ee9301-9226-4072-8b8d-76f4452e78c4',
      response as never,
    );

    expect(publicToursService.getMediaContent).toHaveBeenCalledWith(
      'historic-center',
      'f5ee9301-9226-4072-8b8d-76f4452e78c4',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
  });
});
