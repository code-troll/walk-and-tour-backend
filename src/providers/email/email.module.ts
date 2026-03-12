import { Module } from '@nestjs/common';

import { getProviderConfig } from '../../shared/config/provider.config';
import { EMAIL_PROVIDER } from './email-provider.interface';
import { createEmailProvider } from './email.providers';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: () => createEmailProvider(getProviderConfig()),
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
