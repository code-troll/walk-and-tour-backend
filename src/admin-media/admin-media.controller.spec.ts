import { BadRequestException } from '@nestjs/common';

import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

describe('AdminMediaController', () => {
  let controller: AdminMediaController;
  let adminMediaService: jest.Mocked<AdminMediaService>;

  beforeEach(() => {
    adminMediaService = {
      upload: jest.fn(),
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

    await controller.upload(file, dto);

    expect(adminMediaService.upload).toHaveBeenCalledWith({
      file,
      folder: 'tours/historic-center',
    });
  });

  it('rejects missing files before delegation', async () => {
    expect(() => controller.upload(undefined, {})).toThrow(BadRequestException);
    expect(adminMediaService.upload).not.toHaveBeenCalled();
  });
});
