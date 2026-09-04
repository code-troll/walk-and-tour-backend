import { createProviderConfigMock } from '../../../test/utils/provider-config.mock';
import { collectProviderWarnings } from './provider-warnings';

const warningsFor = (
  nodeEnv: string,
  overrides: Parameters<typeof createProviderConfigMock>[0] = {},
) =>
  collectProviderWarnings({
    nodeEnv,
    config: createProviderConfigMock(overrides),
  });

describe('collectProviderWarnings', () => {
  it('says nothing when development uses the console defaults', () => {
    expect(warningsFor('development')).toEqual([]);
  });

  it('warns that production delivers no email on the console provider', () => {
    // The identity provider is configured so only the email warning can fire.
    const warnings = warningsFor('production', {
      emailProvider: 'console',
      identityProvider: 'auth0',
      identityManagementClientId: 'id',
      identityManagementClientSecret: 'secret',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('EMAIL_PROVIDER');
    expect(warnings[0]).toContain('no email is delivered');
  });

  it('warns that production creates no sign-in identity on the console provider', () => {
    const warnings = warningsFor('production', {
      emailProvider: 'resend',
      resendApiKey: 'key',
      identityProvider: 'console',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('IDENTITY_PROVIDER');
    expect(warnings[0]).toContain('can never sign in');
  });

  it('reports both providers when both are left on console in production', () => {
    expect(warningsFor('production')).toHaveLength(2);
  });

  it('warns when resend is selected without an API key, in any environment', () => {
    const warnings = warningsFor('development', { emailProvider: 'resend' });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('RESEND_API_KEY is missing');
  });

  it('says nothing when resend is fully configured', () => {
    expect(
      warningsFor('production', { emailProvider: 'resend', resendApiKey: 'key' }),
    ).toEqual([
      expect.stringContaining('IDENTITY_PROVIDER'),
    ]);
  });

  it.each([
    ['client id', { identityManagementClientSecret: 'secret' }],
    ['client secret', { identityManagementClientId: 'id' }],
    ['both credentials', {}],
  ])('warns when auth0 identity is missing its %s', (_label, credentials) => {
    const warnings = warningsFor('development', {
      identityProvider: 'auth0',
      ...credentials,
    });

    expect(warnings).toContainEqual(
      expect.stringContaining('management credentials are missing'),
    );
  });

  it('warns when auth0 identity has no issuer', () => {
    const warnings = warningsFor('development', {
      identityProvider: 'auth0',
      identityManagementClientId: 'id',
      identityManagementClientSecret: 'secret',
      identityIssuerBaseUrl: '',
    });

    expect(warnings).toEqual([expect.stringContaining('no issuer is configured')]);
  });

  it('says nothing when auth0 identity is fully configured', () => {
    expect(
      warningsFor('production', {
        emailProvider: 'resend',
        resendApiKey: 'key',
        identityProvider: 'auth0',
        identityManagementClientId: 'id',
        identityManagementClientSecret: 'secret',
      }),
    ).toEqual([]);
  });
});
