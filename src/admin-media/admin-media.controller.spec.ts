import { BadRequestException } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

describe('AdminMediaController', () => {
  let controller: AdminMediaController;
  let adminMediaService: jest.Mocked<AdminMediaService>;

  beforeEach(() => {
    adminMediaService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      upload: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<AdminMediaService>;

    controller = new AdminMediaController(adminMediaService);
  });

  it('delegates upload requests', async () => {
    const file = {
      originalname: 'cover.jpg',
      mimetype: 'image/jpeg',
      size: 128,
      buffer: Buffer.from('image-bytes'),
    };
    const dto = { folder: 'tours/historic-center' };
    const admin = { id: 'admin-1' };

    await controller.upload(file, dto, admin as never);

    expect(adminMediaService.upload).toHaveBeenCalledWith({
      file,
      folder: 'tours/historic-center',
      actorId: 'admin-1',
    });
  });

  it('delegates list requests', async () => {
    const query = { page: 2, limit: 10, mediaType: 'image', search: 'historic' };

    await controller.findAll(query as never);

    expect(adminMediaService.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates detail requests', async () => {
    await controller.findOne('11111111-1111-1111-1111-111111111111');

    expect(adminMediaService.findOne).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
  });

  it('rejects missing files before delegation', async () => {
    expect(() => controller.upload(undefined, {}, { id: 'admin-1' } as never)).toThrow(
      BadRequestException,
    );
    expect(adminMediaService.upload).not.toHaveBeenCalled();
  });

  it('delegates delete requests', async () => {
    await controller.remove('media-1');

    expect(adminMediaService.remove).toHaveBeenCalledWith('media-1');
  });

  it('marks delete requests as 204 no content', () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, AdminMediaController.prototype.remove),
    ).toBe(204);
  });
});
