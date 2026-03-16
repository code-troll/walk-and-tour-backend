import { randomUUID } from 'crypto';
import { extname } from 'path';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';

import { BlogPostEntity } from '../blog-posts/blog-post.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getAppConfig } from '../shared/config/app.config';
import { getProviderConfig } from '../shared/config/provider.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { TourEntity } from '../tours/entities/tour.entity';
import { TourMediaEntity } from '../tours/entities/tour-media.entity';
import { ListMediaDto } from './dto/list-media.dto';

const DEFAULT_FOLDER = 'media';
const IMAGE_MIME_TYPE_PATTERN = /^image\/[a-z0-9.+-]+$/i;
const VIDEO_MIME_TYPE_PATTERN = /^video\/[a-z0-9.+-]+$/i;

export interface AdminMediaResponse {
  id: string;
  mediaType: 'image' | 'video';
  storagePath: string;
  adminContentUrl: string;
  publicContentUrl: string;
  contentType: string;
  size: number;
  originalFilename: string;
}

export interface PersistedAdminMediaResponse extends AdminMediaResponse {
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadMediaInput {
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
  actorId: string;
  folder?: string;
}

@Injectable()
export class AdminMediaService {
  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(TourMediaEntity)
    private readonly tourMediaRepository: Repository<TourMediaEntity>,
    @InjectRepository(BlogPostEntity)
    private readonly blogPostsRepository: Repository<BlogPostEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: ListMediaDto): Promise<{
    items: PersistedAdminMediaResponse[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const [items, total] = await this.mediaAssetsRepository.findAndCount({
      where,
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((item) => this.toAdminMediaResponse(item)),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string): Promise<PersistedAdminMediaResponse> {
    const mediaAsset = await this.getMediaAssetOrThrow(id);
    return this.toAdminMediaResponse(mediaAsset);
  }

  async getContent(id: string): Promise<{
    content: Buffer;
    contentType: string;
    originalFilename: string;
  }> {
    const mediaAsset = await this.getMediaAssetOrThrow(id);
    const stored = await this.storageService.getObject(mediaAsset.storagePath);

    return {
      content: stored.content,
      contentType: stored.contentType ?? mediaAsset.contentType,
      originalFilename: mediaAsset.originalFilename,
    };
  }

  async upload(input: UploadMediaInput): Promise<AdminMediaResponse> {
    const mediaType = this.detectMediaType(input.file.mimetype);
    this.validateFile(input.file, mediaType);

    const path = this.buildStoragePath(input.file.originalname, input.folder);
    const stored = await this.storageService.putObject({
      path,
      content: input.file.buffer,
      contentType: input.file.mimetype,
    });

    const mediaAsset = await this.mediaAssetsRepository.save(
      this.mediaAssetsRepository.create({
        mediaType,
        storagePath: stored.path,
        contentType: stored.contentType,
        size: stored.size,
        originalFilename: input.file.originalname,
        createdBy: input.actorId,
      }),
    );

    return {
      id: mediaAsset.id,
      mediaType,
      storagePath: stored.path,
      adminContentUrl: this.buildAdminContentUrl(mediaAsset.id),
      publicContentUrl: this.buildPublicContentUrl(mediaAsset.id),
      contentType: stored.contentType,
      size: stored.size,
      originalFilename: input.file.originalname,
    };
  }

  async remove(id: string): Promise<void> {
    const mediaAsset = await this.getMediaAssetOrThrow(id);
    const [tourMediaReferences, coverReferences, blogHeroReferences] = await Promise.all([
      this.tourMediaRepository.count({
        where: { mediaId: id },
      }),
      this.toursRepository.count({
        where: { coverMediaId: id },
      }),
      this.blogPostsRepository.count({
        where: { heroMediaId: id },
      }),
    ]);

    if (tourMediaReferences > 0 || coverReferences > 0 || blogHeroReferences > 0) {
      throw new ConflictException(
        `Media asset "${id}" cannot be deleted while it is attached to content.`,
      );
    }

    await this.storageService.deleteObject(mediaAsset.storagePath);
    await this.mediaAssetsRepository.delete({ id });
  }

  private detectMediaType(contentType: string): 'image' | 'video' {
    if (IMAGE_MIME_TYPE_PATTERN.test(contentType)) {
      return 'image';
    }

    if (VIDEO_MIME_TYPE_PATTERN.test(contentType)) {
      return 'video';
    }

    throw new BadRequestException('Only image and video uploads are supported.');
  }

  private validateFile(file: UploadMediaInput['file'], mediaType: 'image' | 'video'): void {
    if (!file) {
      throw new BadRequestException('Media file is required.');
    }

    if (file.size <= 0) {
      throw new BadRequestException('Uploaded file must not be empty.');
    }

    const { mediaImageMaxUploadBytes, mediaVideoMaxUploadBytes } = getAppConfig();
    const maxUploadSizeBytes =
      mediaType === 'image' ? mediaImageMaxUploadBytes : mediaVideoMaxUploadBytes;

    if (file.size > maxUploadSizeBytes) {
      throw new BadRequestException(
        `Uploaded file must be at most ${maxUploadSizeBytes} bytes.`,
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file content is missing.');
    }
  }

  private buildStoragePath(originalName: string, folder?: string): string {
    const safeFolder = folder ?? DEFAULT_FOLDER;
    const extension = this.normalizeExtension(originalName);

    return `${safeFolder}/${randomUUID()}${extension}`;
  }

  private normalizeExtension(originalName: string): string {
    const extension = extname(originalName).toLowerCase();

    if (!extension || extension.length > 10) {
      return '';
    }

    return extension;
  }

  private buildWhere(query: ListMediaDto): FindOptionsWhere<MediaAssetEntity>[] | FindOptionsWhere<MediaAssetEntity> {
    const baseWhere = query.mediaType ? { mediaType: query.mediaType } : {};

    if (!query.search || query.search.trim().length === 0) {
      return baseWhere;
    }

    const search = `%${query.search.trim()}%`;

    return [
      {
        ...baseWhere,
        originalFilename: ILike(search),
      },
      {
        ...baseWhere,
        storagePath: ILike(search),
      },
    ];
  }

  private toAdminMediaResponse(mediaAsset: MediaAssetEntity): PersistedAdminMediaResponse {
    return {
      id: mediaAsset.id,
      mediaType: mediaAsset.mediaType,
      storagePath: mediaAsset.storagePath,
      adminContentUrl: this.buildAdminContentUrl(mediaAsset.id),
      publicContentUrl: this.buildPublicContentUrl(mediaAsset.id),
      contentType: mediaAsset.contentType,
      size: mediaAsset.size,
      originalFilename: mediaAsset.originalFilename,
      createdAt: mediaAsset.createdAt,
      updatedAt: mediaAsset.updatedAt,
    };
  }

  private async getMediaAssetOrThrow(id: string): Promise<MediaAssetEntity> {
    const mediaAsset = await this.mediaAssetsRepository.findOne({
      where: { id },
    });

    if (!mediaAsset) {
      throw new NotFoundException(`Media asset "${id}" was not found.`);
    }

    return mediaAsset;
  }

  private buildAdminContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/admin/media/${mediaId}/content`;
  }

  private buildPublicContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/media/${mediaId}/content`;
  }
}
