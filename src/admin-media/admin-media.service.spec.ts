import { BadRequestException } from '@nestjs/common';

import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { AdminMediaService } from './admin-media.service';

describe('AdminMediaService', () => {
  let service: AdminMediaService;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    storageService = {
      putObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    service = new AdminMediaService(storageService);
  });

  it('uploads images through the configured storage service', async () => {
    storageService.putObject.mockResolvedValue({
      path: 'tours/historic-center/uploaded.jpg',
      publicUrl: 'http://localhost:3000/media/tours/historic-center/uploaded.jpg',
      contentType: 'image/jpeg',
      size: 128,
    });

    const result = await service.upload({
      folder: 'tours/historic-center',
      file: {
        originalname: 'cover.jpg',
        mimetype: 'image/jpeg',
        size: 128,
        buffer: Buffer.from('image-bytes'),
      },
    });

    expect(storageService.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringMatching(/^tours\/historic-center\/.+\.jpg$/),
        contentType: 'image/jpeg',
        content: expect.any(Buffer),
      }),
    );
    expect(result).toEqual({
      ref: 'tours/historic-center/uploaded.jpg',
      altText: null,
      publicUrl: 'http://localhost:3000/media/tours/historic-center/uploaded.jpg',
      contentType: 'image/jpeg',
      size: 128,
    });
  });

  it('rejects non-image uploads', async () => {
    await expect(
      service.upload({
        file: {
          originalname: 'notes.txt',
          mimetype: 'text/plain',
          size: 64,
          buffer: Buffer.from('hello'),
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized uploads', async () => {
    await expect(
      service.upload({
        file: {
          originalname: 'cover.jpg',
          mimetype: 'image/jpeg',
          size: 10 * 1024 * 1024 + 1,
          buffer: Buffer.alloc(10),
        },
      }),
    ).rejects.toThrow('Uploaded file must be at most 10485760 bytes.');
  });
});
