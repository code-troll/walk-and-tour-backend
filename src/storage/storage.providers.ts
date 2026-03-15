import { ProviderConfig } from '../shared/config/provider.config';
import { LocalFilesystemStorageService } from './local-filesystem-storage.service';
import { RailwayS3StorageService } from './railway-s3-storage.service';
import { StorageService } from './storage-service.interface';

export function createStorageService(config: ProviderConfig): StorageService {
  if (config.storageDriver === 'railway') {
    return new RailwayS3StorageService(config);
  }

  return new LocalFilesystemStorageService(config);
}
