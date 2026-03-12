import { Module } from '@nestjs/common';

import { getProviderConfig } from '../shared/config/provider.config';
import { STORAGE_SERVICE } from './storage-service.interface';
import { createStorageService } from './storage.providers';

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: () => createStorageService(getProviderConfig()),
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
