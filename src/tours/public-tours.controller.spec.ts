import { PublicToursController } from './public-tours.controller';
import { PublicToursService } from './public-tours.service';

describe('PublicToursController', () => {
  let controller: PublicToursController;
  let publicToursService: jest.Mocked<PublicToursService>;

  beforeEach(() => {
    publicToursService = {
      findAll: jest.fn(),
      findOneBySlug: jest.fn(),
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
});
