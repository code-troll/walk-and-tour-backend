import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

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
      createTranslation: jest.fn(),
      updateTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      unpublishTranslation: jest.fn(),
      deleteTranslation: jest.fn(),
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
      tourType: 'group',
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

  it('delegates translation create requests with the authenticated admin', async () => {
    const dto = {
      languageCode: 'en',
      payload: { title: 'Historic Center' },
    };
    const admin = { id: 'admin-1' };

    await controller.createTranslation(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto as never,
      admin as never,
    );

    expect(toursService.createTranslation).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto,
      admin,
    );
  });

  it('delegates translation update requests with the authenticated admin', async () => {
    const dto = {
      payload: { title: 'Historic Center Updated' },
    };
    const admin = { id: 'admin-1' };

    await controller.updateTranslation(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      dto as never,
      admin as never,
    );

    expect(toursService.updateTranslation).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      dto,
      admin,
    );
  });

  it('delegates translation publish requests with the authenticated admin', async () => {
    const dto = { bookingReferenceId: 'booking-ref-123' };
    const admin = { id: 'admin-1' };

    await controller.publishTranslation(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      dto as never,
      admin as never,
    );

    expect(toursService.publishTranslation).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      dto,
      admin,
    );
  });

  it('delegates translation unpublish requests with the authenticated admin', async () => {
    const admin = { id: 'admin-1' };

    await controller.unpublishTranslation(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      admin as never,
    );

    expect(toursService.unpublishTranslation).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      admin,
    );
  });

  it('delegates translation delete requests with the authenticated admin', async () => {
    const admin = { id: 'admin-1' };

    await controller.deleteTranslation(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      admin as never,
    );

    expect(toursService.deleteTranslation).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'en',
      admin,
    );
  });

  it('marks translation delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        ToursController.prototype.deleteTranslation,
      ),
    ).toBe(204);
  });
});
