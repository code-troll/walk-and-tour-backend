import { Injectable } from '@nestjs/common';

import { ProviderConfig } from '../shared/config/provider.config';
import {
  PutStoredObjectInput,
  StorageService,
  StoredObjectDescriptor,
} from './storage-service.interface';

interface FetchLike {
  (input: string, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
}

@Injectable()
export class SupabaseStorageService implements StorageService {
  constructor(
    private readonly config: ProviderConfig,
    private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ) {}

  async putObject(input: PutStoredObjectInput): Promise<StoredObjectDescriptor> {
    const { supabaseUrl, supabaseServiceRoleKey, supabaseBucket } = this.config;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_DRIVER=supabase.',
      );
    }

    const response = await this.fetchImpl(
      `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${supabaseBucket}/${input.path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
          'Content-Type': input.contentType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(input.content),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Supabase storage upload failed with status ${response.status}: ${await response.text()}`,
      );
    }

    return {
      path: input.path,
      contentType: input.contentType,
      size: input.content.length,
      publicUrl: this.getPublicUrl(input.path),
    };
  }

  async deleteObject(path: string): Promise<void> {
    const { supabaseUrl, supabaseServiceRoleKey, supabaseBucket } = this.config;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_DRIVER=supabase.',
      );
    }

    const response = await this.fetchImpl(
      `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${supabaseBucket}/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Supabase storage delete failed with status ${response.status}: ${await response.text()}`,
      );
    }
  }

  getPublicUrl(path: string): string {
    if (!this.config.supabaseUrl) {
      throw new Error('SUPABASE_URL is required when STORAGE_DRIVER=supabase.');
    }

    return `${this.config.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${this.config.supabaseBucket}/${path}`;
  }
}
