import { ConsoleEmailProvider } from './console-email.provider';
import { ResendEmailProvider } from './resend-email.provider';
import { ProviderConfig } from '../../shared/config/provider.config';
import { EmailProvider } from './email-provider.interface';

export function createEmailProvider(config: ProviderConfig): EmailProvider {
  if (config.emailProvider === 'resend') {
    return new ResendEmailProvider(config);
  }

  return new ConsoleEmailProvider(config);
}
