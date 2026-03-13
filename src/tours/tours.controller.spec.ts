import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

describe('ToursController', () => {
  let controller: ToursController;
  let toursService: jest.Mocked<ToursService>;

  beforeEach(() => {
    toursService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ToursService>;

    controller = new ToursController(toursService);
  });

  it('delegates list requests', async () => {
    await controller.findAll();
    expect(toursService.findAll).toHaveBeenCalled();
  });

  it('delegates detail requests', async () => {
    await controller.findOne('0f34b359-4a4e-4f2c-9ef0-77c9a9f87901');
    expect(toursService.findOne).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
    );
  });

  it('delegates create requests with the authenticated admin', async () => {
    const dto = {
      name: 'Historic Center Main Tour',
      slug: 'historic-center',
      publicationStatus: 'draft',
    };
    const admin = { id: 'admin-1' };

    await controller.create(dto as never, admin as never);

    expect(toursService.create).toHaveBeenCalledWith(dto, admin);
  });

  it('delegates update requests with the authenticated admin', async () => {
    const dto = { slug: 'historic-center' };
    const admin = { id: 'admin-1' };

    await controller.update(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto as never,
      admin as never,
    );

    expect(toursService.update).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto,
      admin,
    );
  });
});
