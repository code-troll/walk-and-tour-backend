import { StreamableFile } from '@nestjs/common';

import { AdminMediaService } from '../admin-media/admin-media.service';
import { MediaController } from './media.controller';

describe('MediaController', () => {
  let controller: MediaController;
  let adminMediaService: jest.Mocked<AdminMediaService>;

  beforeEach(() => {
    adminMediaService = {
      getContent: jest.fn(),
    } as unknown as jest.Mocked<AdminMediaService>;

    controller = new MediaController(adminMediaService);
  });

  it('streams public media content with response headers', async () => {
    adminMediaService.getContent.mockResolvedValue({
      content: Buffer.from('image-bytes'),
      contentType: 'image/jpeg',
      originalFilename: 'cover".jpg',
    });
    const response = {
      setHeader: jest.fn(),
    };

    const result = await controller.fetchContent(
      '11111111-1111-1111-1111-111111111111',
      response,
    );

    expect(adminMediaService.getContent).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="cover.jpg"',
    );
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
