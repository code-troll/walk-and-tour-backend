import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { getProviderConfig } from '../shared/config/provider.config';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../providers/email/email-provider.interface';
import {
  IDENTITY_PROVIDER,
  IdentityProvider,
  IdentityUserConflictError,
} from '../providers/identity/identity-provider.interface';
import { resolveHotelUsername } from './hotel-username';
import { HotelUserEntity } from './entities/hotel-user.entity';
import { HotelEntity } from './entities/hotel.entity';

/**
 * How many usernames to offer the identity provider before concluding that the
 * address is the thing it is refusing. Small on purpose: each one is a network
 * call, and past two or three the answer is not the username.
 */
const IDENTITY_USERNAME_ATTEMPTS = 3;

const PASSWORD_SETUP_TICKET_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface HotelUserView {
  id: string;
  hotelId: string;
  username: string;
  email: string;
  status: string;
  lastLoginAt: Date | null;
  audit: {
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

@Injectable()
export class HotelUsersService {
  private readonly logger = new Logger(HotelUsersService.name);

  constructor(
    @InjectRepository(HotelEntity)
    private readonly hotelsRepository: Repository<HotelEntity>,
    @InjectRepository(HotelUserEntity)
    private readonly hotelUsersRepository: Repository<HotelUserEntity>,
    @Inject(IDENTITY_PROVIDER)
    private readonly identityProvider: IdentityProvider,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  /**
   * A hotel that has no access user yet is a missing sub-resource, not an empty
   * one, so this reports `404` rather than a null body. Callers that treat "no
   * user yet" as a normal state can map that status to their own empty value.
   */
  async findByHotelIdOrThrow(hotelId: string): Promise<HotelUserView> {
    await this.findHotelOrThrow(hotelId);

    return this.toView(await this.findUserOrThrow(hotelId));
  }

  /**
   * Creates the hotel's access user and sends it an invitation to choose a
   * password.
   *
   * The local row and the identity are two separate sources of truth, and the
   * identity provider has uniqueness rules of its own. The username is reserved
   * locally first so the unique index arbitrates, and if the provider then
   * refuses the name the local row is removed again rather than left behind
   * pointing at nothing.
   */
  /**
   * Give a hotel its access user.
   *
   * Two things here exist because of one bug. Creating a user whose email the
   * identity provider already knew failed, and then failed identically forever:
   * the row was rolled back correctly, but every retry rebuilt the same email
   * and the same username and hit the same wall, so a hotel could reach a state
   * with no user and no way to ever get one.
   *
   *   1. The address is now an argument, defaulting to the hotel's contact
   *      email. That default is right most of the time and impossible the rest —
   *      two hotels sharing a reception mailbox, or an address already used by
   *      anything else in the tenant. A different address is the way out, and
   *      there was none.
   *
   *   2. A username refused by the provider is retried with the next candidate.
   *      Our database is not the authority on what the provider holds: a
   *      username freed by deleting a hotel here is still taken there, and
   *      checking only `hotel_users` will keep proposing it.
   */
  async create(
    hotelId: string,
    admin: AuthenticatedAdmin,
    input?: { email?: string },
  ): Promise<HotelUserView> {
    const hotel = await this.findHotelOrThrow(hotelId);

    const existing = await this.hotelUsersRepository.findOne({ where: { hotelId } });

    if (existing) {
      throw new ConflictException(
        `Hotel "${hotel.name}" already has an access user.`,
      );
    }

    const email = input?.email?.trim() || hotel.email;

    await this.assertEmailAvailable(email);

    const username = await this.nextFreeUsername(hotel.name);

    // Reserved here before the provider is asked, so two administrators clicking
    // at once cannot be handed the same username.
    const user = await this.hotelUsersRepository.save(
      this.hotelUsersRepository.create({
        hotelId,
        username,
        email,
        identityUserId: null,
        status: 'invited',
        createdBy: admin.id,
        updatedBy: admin.id,
      }),
    );

    let identityUserId: string;

    try {
      identityUserId = await this.createIdentityWithRetries(user, hotel.name, email);
    } catch (error) {
      await this.hotelUsersRepository.delete({ id: user.id });

      if (error instanceof IdentityUserConflictError) {
        throw new ConflictException(
          `The sign-in address "${email}" is already in use. Create this hotel's ` +
            'access user with a different address.',
        );
      }

      throw error;
    }

    user.identityUserId = identityUserId;
    await this.hotelUsersRepository.save(user);

    await this.sendPasswordSetup({ hotel, user, isResend: false });

    return this.toView(user);
  }

  async resendInvitation(
    hotelId: string,
    admin: AuthenticatedAdmin,
  ): Promise<HotelUserView> {
    const hotel = await this.findHotelOrThrow(hotelId);
    const user = await this.findUserOrThrow(hotelId);

    if (user.status === 'disabled') {
      throw new ConflictException(
        'This access user is disabled. Enable it before sending a new password link.',
      );
    }

    user.updatedBy = admin.id;
    await this.hotelUsersRepository.save(user);

    await this.sendPasswordSetup({ hotel, user, isResend: true });

    return this.toView(user);
  }

  async setEnabled(
    hotelId: string,
    isEnabled: boolean,
    admin: AuthenticatedAdmin,
  ): Promise<HotelUserView> {
    await this.findHotelOrThrow(hotelId);
    const user = await this.findUserOrThrow(hotelId);

    if (user.identityUserId) {
      if (isEnabled) {
        await this.identityProvider.unblockUser(user.identityUserId);
      } else {
        await this.identityProvider.blockUser(user.identityUserId);
      }
    }

    // Disabling is reversible, so a user that never signed in returns to
    // `invited` rather than being promoted to `active` by being re-enabled.
    user.status = isEnabled ? (user.lastLoginAt ? 'active' : 'invited') : 'disabled';
    user.updatedBy = admin.id;
    await this.hotelUsersRepository.save(user);

    return this.toView(user);
  }

  private async sendPasswordSetup({
    hotel,
    user,
    isResend,
  }: {
    hotel: HotelEntity;
    user: HotelUserEntity;
    isResend: boolean;
  }): Promise<void> {
    if (!user.identityUserId) {
      throw new ConflictException(
        'This access user has no identity yet, so a password link cannot be created.',
      );
    }

    const config = getProviderConfig();
    const ticket = await this.identityProvider.createPasswordSetupTicket({
      identityUserId: user.identityUserId,
      resultUrl: `${config.hotelPortalBaseUrl}/password-updated`,
      ttlSeconds: PASSWORD_SETUP_TICKET_TTL_SECONDS,
    });

    await this.emailProvider.sendHotelPasswordSetup({
      recipientEmail: user.email,
      hotelName: hotel.name,
      username: user.username,
      setupUrl: ticket.ticketUrl,
      portalUrl: config.hotelPortalBaseUrl,
      expiresAt: ticket.expiresAt,
      isResend,
    });

    this.logger.log(
      `Sent a password ${isResend ? 'reset' : 'setup'} link to hotel "${hotel.name}".`,
    );
  }

  /**
   * The first username the provider will accept.
   *
   * A conflict is not the end: the provider does not say whether the username or
   * the address clashed, so the cheap possibility is tried first. If a handful of
   * candidates all fail, the address is what is taken, and the caller says so —
   * that is the message an administrator can actually act on.
   */
  private async createIdentityWithRetries(
    user: HotelUserEntity,
    hotelName: string,
    email: string,
  ): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt < IDENTITY_USERNAME_ATTEMPTS; attempt += 1) {
      try {
        const created = await this.identityProvider.createUser({
          username: user.username,
          email,
          displayName: hotelName,
        });

        return created.identityUserId;
      } catch (error) {
        if (!(error instanceof IdentityUserConflictError)) {
          throw error;
        }

        lastError = error;

        if (attempt < IDENTITY_USERNAME_ATTEMPTS - 1) {
          // Keep the reservation, move it to the next candidate.
          user.username = await this.nextFreeUsername(hotelName, user.username);
          await this.hotelUsersRepository.save(user);
        }
      }
    }

    throw lastError;
  }

  private async nextFreeUsername(hotelName: string, after?: string): Promise<string> {
    const rejected = new Set(after ? [after] : []);

    return resolveHotelUsername({
      hotelName,
      isTaken: async (candidate) =>
        rejected.has(candidate)
        || (await this.hotelUsersRepository.count({
          where: { username: candidate },
        })) > 0,
    });
  }

  private async findHotelOrThrow(hotelId: string): Promise<HotelEntity> {
    const hotel = await this.hotelsRepository.findOne({ where: { id: hotelId } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${hotelId}" was not found.`);
    }

    return hotel;
  }

  private async findUserOrThrow(hotelId: string): Promise<HotelUserEntity> {
    const user = await this.hotelUsersRepository.findOne({ where: { hotelId } });

    if (!user) {
      throw new NotFoundException('This hotel does not have an access user yet.');
    }

    return user;
  }

  private async assertEmailAvailable(email: string, exceptUserId?: string): Promise<void> {
    const existing = await this.hotelUsersRepository.findOne({
      where: exceptUserId ? { email, id: Not(exceptUserId) } : { email },
    });

    if (existing) {
      throw new ConflictException(
        `Another hotel access user already signs in with "${email}".`,
      );
    }
  }

  private toView(user: HotelUserEntity): HotelUserView {
    return {
      id: user.id,
      hotelId: user.hotelId,
      username: user.username,
      email: user.email,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      audit: {
        createdBy: user.createdBy,
        updatedBy: user.updatedBy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }
}
