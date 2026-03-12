import { ProviderConfig } from '../shared/config/provider.config';
import { LocalFilesystemStorageService } from './local-filesystem-storage.service';
import { StorageService } from './storage-service.interface';
import { SupabaseStorageService } from './supabase-storage.service';

export function createStorageService(config: ProviderConfig): StorageService {
  if (config.storageDriver === 'supabase') {
    return new SupabaseStorageService(config);
  }

  return new LocalFilesystemStorageService(config);
}
