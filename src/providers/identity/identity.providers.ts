import { ProviderConfig } from '../../shared/config/provider.config';
import { Auth0IdentityProvider } from './auth0-identity.provider';
import { ConsoleIdentityProvider } from './console-identity.provider';
import { IdentityProvider } from './identity-provider.interface';

export function createIdentityProvider(config: ProviderConfig): IdentityProvider {
  if (config.identityProvider === 'auth0') {
    return new Auth0IdentityProvider(config);
  }

  return new ConsoleIdentityProvider(config);
}
