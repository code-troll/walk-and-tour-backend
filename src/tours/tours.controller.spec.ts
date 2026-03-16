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
      listMedia: jest.fn(),
      attachMedia: jest.fn(),
      updateMedia: jest.fn(),
      detachMedia: jest.fn(),
      setCoverMedia: jest.fn(),
      clearCoverMedia: jest.fn(),
      createTranslation: jest.fn(),
      updateTranslation: jest.fn(),
      publishTranslation: jest.fn(),
      unpublishTranslation: jest.fn(),
      deleteTranslation: jest.fn(),
    } as unknown as jest.Mocked<ToursService>;

    controller = new ToursController(toursService);
  });

  it('delegates list requests', async () => {
    const query = { tagKeys: ['history'], tourTypes: ['company'] };

    await controller.findAll(query as never);

    expect(toursService.findAll).toHaveBeenCalledWith(query);
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

  it('delegates attached media listing', async () => {
    await controller.listMedia('0f34b359-4a4e-4f2c-9ef0-77c9a9f87901');

    expect(toursService.listMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
    );
  });

  it('delegates tour media attachment', async () => {
    const dto = { mediaId: 'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824' };
    const admin = { id: 'admin-1' };

    await controller.attachMedia(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto as never,
      admin as never,
    );

    expect(toursService.attachMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto,
      admin,
    );
  });

  it('delegates tour media metadata updates', async () => {
    const dto = { orderIndex: 1 };
    const admin = { id: 'admin-1' };

    await controller.updateMedia(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824',
      dto as never,
      admin as never,
    );

    expect(toursService.updateMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824',
      dto,
      admin,
    );
  });

  it('delegates tour media detachment', async () => {
    const admin = { id: 'admin-1' };

    await controller.detachMedia(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824',
      admin as never,
    );

    expect(toursService.detachMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824',
      admin,
    );
  });

  it('delegates cover media assignment', async () => {
    const dto = { mediaId: 'fbfd5720-a2d9-4cf8-a7b8-5520d9a34824' };
    const admin = { id: 'admin-1' };

    await controller.setCoverMedia(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto as never,
      admin as never,
    );

    expect(toursService.setCoverMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      dto,
      admin,
    );
  });

  it('delegates cover media clearing', async () => {
    const admin = { id: 'admin-1' };

    await controller.clearCoverMedia(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
      admin as never,
    );

    expect(toursService.clearCoverMedia).toHaveBeenCalledWith(
      '0f34b359-4a4e-4f2c-9ef0-77c9a9f87901',
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

  it('marks tour media detach requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        ToursController.prototype.detachMedia,
      ),
    ).toBe(204);
  });
});
