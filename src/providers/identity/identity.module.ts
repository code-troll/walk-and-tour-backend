import { Module } from '@nestjs/common';

import { getProviderConfig } from '../../shared/config/provider.config';
import { IDENTITY_PROVIDER } from './identity-provider.interface';
import { createIdentityProvider } from './identity.providers';

@Module({
  providers: [
    {
      provide: IDENTITY_PROVIDER,
      useFactory: () => createIdentityProvider(getProviderConfig()),
    },
  ],
  exports: [IDENTITY_PROVIDER],
})
export class IdentityModule {}
