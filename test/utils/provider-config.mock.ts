import { ProviderConfig } from '../../src/shared/config/provider.config';

/**
 * Builds a complete {@link ProviderConfig} for tests.
 *
 * Specs only care about a handful of fields at a time, but the type requires
 * all of them. Going through this factory means adding a setting does not break
 * every spec that happens to construct a config.
 */
export const createProviderConfigMock = (
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig => ({
  appBaseUrl: 'https://backend.example.com',
  publicSiteBaseUrl: 'https://walkandtour.dk',
  emailProvider: 'console',
  emailFrom: 'Walk and Tour <no-reply@example.com>',
  storageDriver: 'local',
  localStorageRoot: 'storage',
  localStoragePublicBaseUrl: 'https://backend.example.com/media',
  railwayStorageRegion: 'auto',
  railwayStorageUrlStyle: 'virtual-hosted',
  defaultEventTimezone: 'Europe/Copenhagen',
  identityProvider: 'console',
  identityIssuerBaseUrl: 'https://tenant.example.auth0.com',
  hotelIdentityConnection: 'Hotel-Portal-Users',
  hotelPortalBaseUrl: 'https://hotels.example.com',
  ...overrides,
});
