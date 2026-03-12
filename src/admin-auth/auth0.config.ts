export interface Auth0Config {
  issuerBaseUrl: string;
  audience: string;
  bootstrapSuperAdminEmail?: string;
  bootstrapSuperAdminSub?: string;
}

export function getAuth0Config(): Auth0Config {
  return {
    issuerBaseUrl: normalizeIssuer(process.env.AUTH0_ISSUER_BASE_URL),
    audience: process.env.AUTH0_AUDIENCE ?? '',
    bootstrapSuperAdminEmail: normalizeOptionalString(
      process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL,
    ),
    bootstrapSuperAdminSub: normalizeOptionalString(
      process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_SUB,
    ),
  };
}

function normalizeIssuer(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.endsWith('/') ? value : `${value}/`;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
