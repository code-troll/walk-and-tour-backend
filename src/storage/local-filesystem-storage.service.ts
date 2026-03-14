import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';

import { Injectable } from '@nestjs/common';

import { ProviderConfig } from '../shared/config/provider.config';
import {
  PutStoredObjectInput,
  StorageService,
  StoredObjectDescriptor,
} from './storage-service.interface';

@Injectable()
export class LocalFilesystemStorageService implements StorageService {
  constructor(private readonly config: ProviderConfig) {}

  async putObject(input: PutStoredObjectInput): Promise<StoredObjectDescriptor> {
    const absolutePath = this.resolveStoragePath(input.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.content);

    return {
      path: input.path,
      contentType: input.contentType,
      size: input.content.length,
      publicUrl: this.getPublicUrl(input.path),
    };
  }

  async getObject(path: string): Promise<{ content: Buffer }> {
    return {
      content: await readFile(this.resolveStoragePath(path)),
    };
  }

  async deleteObject(path: string): Promise<void> {
    await rm(this.resolveStoragePath(path), { force: true });
  }

  getPublicUrl(path: string): string {
    return `${this.config.localStoragePublicBaseUrl.replace(/\/$/, '')}/${path}`;
  }

  private resolveStoragePath(path: string): string {
    return resolve(this.config.localStorageRoot, path);
  }
}
