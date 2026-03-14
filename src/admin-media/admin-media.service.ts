import { randomUUID } from 'crypto';
import { extname } from 'path';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_FOLDER = 'tours';
const IMAGE_MIME_TYPE_PATTERN = /^image\/[a-z0-9.+-]+$/i;

export interface UploadMediaInput {
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
  folder?: string;
}

@Injectable()
export class AdminMediaService {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
  ) {}

  async upload(input: UploadMediaInput): Promise<{
    ref: string;
    altText: null;
    publicUrl: string;
    contentType: string;
    size: number;
  }> {
    this.validateFile(input.file);

    const path = this.buildStoragePath(input.file.originalname, input.folder);
    const stored = await this.storageService.putObject({
      path,
      content: input.file.buffer,
      contentType: input.file.mimetype,
    });

    return {
      ref: stored.path,
      altText: null,
      publicUrl: stored.publicUrl,
      contentType: stored.contentType,
      size: stored.size,
    };
  }

  private validateFile(file: UploadMediaInput['file']): void {
    if (!file) {
      throw new BadRequestException('Media file is required.');
    }

    if (!IMAGE_MIME_TYPE_PATTERN.test(file.mimetype)) {
      throw new BadRequestException('Only image uploads are supported.');
    }

    if (file.size <= 0) {
      throw new BadRequestException('Uploaded file must not be empty.');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        `Uploaded file must be at most ${MAX_UPLOAD_SIZE_BYTES} bytes.`,
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
}
