export type JWTPayload = Record<string, unknown>;

export const createRemoteJWKSet = jest.fn(() => jest.fn());
export const jwtVerify = jest.fn();
