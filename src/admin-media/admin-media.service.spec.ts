import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { BlogPostEntity } from '../blog-posts/blog-post.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { TourMediaEntity } from '../tours/entities/tour-media.entity';
import { StorageService } from '../storage/storage-service.interface';
import { AdminMediaService } from './admin-media.service';

describe('AdminMediaService', () => {
  let service: AdminMediaService;
  let mediaAssetsRepository: RepositoryMock<MediaAssetEntity>;
  let toursRepository: RepositoryMock<TourEntity>;
  let tourMediaRepository: RepositoryMock<TourMediaEntity>;
  let blogPostsRepository: RepositoryMock<BlogPostEntity>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    mediaAssetsRepository = createRepositoryMock<MediaAssetEntity>();
    toursRepository = createRepositoryMock<TourEntity>();
    tourMediaRepository = createRepositoryMock<TourMediaEntity>();
    blogPostsRepository = createRepositoryMock<BlogPostEntity>();
    storageService = {
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    service = new AdminMediaService(
      mediaAssetsRepository as never,
      toursRepository as never,
      tourMediaRepository as never,
      blogPostsRepository as never,
      storageService,
    );
  });

  it('uploads images through the configured storage service and persists a media asset', async () => {
    storageService.putObject.mockResolvedValue({
      path: 'tours/historic-center/uploaded.jpg',
      publicUrl: 'http://localhost:3000/media/tours/historic-center/uploaded.jpg',
      contentType: 'image/jpeg',
      size: 128,
    });
    mediaAssetsRepository.save.mockImplementation(async (value) => ({
      id: 'media-1',
      ...value,
    }) as MediaAssetEntity);

    const result = await service.upload({
      actorId: 'admin-1',
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
    expect(mediaAssetsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'image',
        storagePath: 'tours/historic-center/uploaded.jpg',
        createdBy: 'admin-1',
      }),
    );
    expect(result).toEqual({
      id: 'media-1',
      mediaType: 'image',
      storagePath: 'tours/historic-center/uploaded.jpg',
      contentUrl: 'http://api.dev.walkandtour.dk:3000/api/admin/media/media-1/content',
      contentType: 'image/jpeg',
      size: 128,
      originalFilename: 'cover.jpg',
    });
  });

  it('lists paginated media assets with admin content urls', async () => {
    mediaAssetsRepository.findAndCount.mockResolvedValue([
      [
        createMediaAssetEntity({
          id: 'media-1',
          originalFilename: 'cover.jpg',
          storagePath: 'tours/cover.jpg',
        }),
      ],
      1,
    ]);
    const result = await service.findAll({ page: 1, limit: 20, search: 'cover' });

    expect(mediaAssetsRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'media-1',
          contentUrl: 'http://api.dev.walkandtour.dk:3000/api/admin/media/media-1/content',
        }),
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it('returns one media asset by id', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());

    const result = await service.findOne('media-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'media-1',
        contentUrl: 'http://api.dev.walkandtour.dk:3000/api/admin/media/media-1/content',
      }),
    );
  });

  it('uploads videos when they fit the configured limits', async () => {
    storageService.putObject.mockResolvedValue({
      path: 'media/video.mp4',
      publicUrl: 'http://localhost:3000/media/video.mp4',
      contentType: 'video/mp4',
      size: 2048,
    });
    mediaAssetsRepository.save.mockImplementation(async (value) => ({
      id: 'media-2',
      ...value,
    }) as MediaAssetEntity);

    const result = await service.upload({
      actorId: 'admin-1',
      file: {
        originalname: 'clip.mp4',
        mimetype: 'video/mp4',
        size: 2048,
        buffer: Buffer.from('video-bytes'),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'media-2',
        mediaType: 'video',
        storagePath: 'media/video.mp4',
      }),
    );
  });

  it('rejects unsupported uploads', async () => {
    await expect(
      service.upload({
        actorId: 'admin-1',
        file: {
          originalname: 'notes.txt',
          mimetype: 'text/plain',
          size: 64,
          buffer: Buffer.from('hello'),
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects deleting unknown media assets', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('media-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deleting referenced media assets', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());
    tourMediaRepository.count.mockResolvedValue(1);
    toursRepository.count.mockResolvedValue(0);
    blogPostsRepository.count.mockResolvedValue(0);

    await expect(service.remove('media-1')).rejects.toBeInstanceOf(ConflictException);
    expect(storageService.deleteObject).not.toHaveBeenCalled();
  });

  it('deletes unreferenced media assets and the stored object', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());
    tourMediaRepository.count.mockResolvedValue(0);
    toursRepository.count.mockResolvedValue(0);
    blogPostsRepository.count.mockResolvedValue(0);

    await service.remove('media-1');

    expect(storageService.deleteObject).toHaveBeenCalledWith(
      'tours/historic-center/uploaded.jpg',
    );
    expect(mediaAssetsRepository.delete).toHaveBeenCalledWith({ id: 'media-1' });
  });

  it('rejects deleting media assets referenced by a blog post hero image', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());
    tourMediaRepository.count.mockResolvedValue(0);
    toursRepository.count.mockResolvedValue(0);
    blogPostsRepository.count.mockResolvedValue(1);

    await expect(service.remove('media-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'tours/historic-center/uploaded.jpg',
    contentType: 'image/jpeg',
    size: 128,
    originalFilename: 'cover.jpg',
    createdBy: 'admin-1',
    tourUsages: [],
    createdAt: new Date('2026-03-14T10:00:00.000Z'),
    updatedAt: new Date('2026-03-14T10:00:00.000Z'),
    ...overrides,
  } as MediaAssetEntity;
}
