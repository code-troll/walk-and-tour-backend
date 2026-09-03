export interface CreateIdentityUserInput {
  username: string;
  email: string;
  /** Shown in the identity provider's own user list, for support. */
  displayName: string;
}

export interface CreateIdentityUserResult {
  /** The identity provider's subject, stored so the token can be resolved later. */
  identityUserId: string;
}

export interface CreatePasswordSetupTicketInput {
  identityUserId: string;
  /** Where the identity provider sends the browser once the password is set. */
  resultUrl: string;
  ttlSeconds: number;
}

export interface CreatePasswordSetupTicketResult {
  ticketUrl: string;
  expiresAt: Date;
}

/**
 * Creates and manages the sign-in identities of hotel access users.
 *
 * The backend owns this rather than the frontend because it needs machine
 * credentials that must never reach a browser. Implementations must not contact
 * the provider while the module is being constructed: the backend has to keep
 * booting without identity credentials configured.
 */
export interface IdentityProvider {
  createUser(input: CreateIdentityUserInput): Promise<CreateIdentityUserResult>;

  createPasswordSetupTicket(
    input: CreatePasswordSetupTicketInput,
  ): Promise<CreatePasswordSetupTicketResult>;

  blockUser(identityUserId: string): Promise<void>;

  unblockUser(identityUserId: string): Promise<void>;

  deleteUser(identityUserId: string): Promise<void>;
}

/**
 * Thrown when the identity provider already has a user with this username or
 * email. The database unique index and the provider's own uniqueness rules are
 * two separate sources of truth, so a name that is free locally can still be
 * refused here.
 */
export class IdentityUserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityUserConflictError';
  }
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');
