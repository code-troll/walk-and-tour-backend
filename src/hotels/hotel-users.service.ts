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
  async create(
    hotelId: string,
    admin: AuthenticatedAdmin,
  ): Promise<HotelUserView> {
    const hotel = await this.findHotelOrThrow(hotelId);

    const existing = await this.hotelUsersRepository.findOne({ where: { hotelId } });

    if (existing) {
      throw new ConflictException(
        `Hotel "${hotel.name}" already has an access user.`,
      );
    }

    await this.assertEmailAvailable(hotel.email);

    const username = await resolveHotelUsername({
      hotelName: hotel.name,
      isTaken: async (candidate) =>
        (await this.hotelUsersRepository.count({ where: { username: candidate } })) > 0,
    });

    const user = await this.hotelUsersRepository.save(
      this.hotelUsersRepository.create({
        hotelId,
        username,
        email: hotel.email,
        identityUserId: null,
        status: 'invited',
        createdBy: admin.id,
        updatedBy: admin.id,
      }),
    );

    let identityUserId: string;

    try {
      const created = await this.identityProvider.createUser({
        username,
        email: hotel.email,
        displayName: hotel.name,
      });
      identityUserId = created.identityUserId;
    } catch (error) {
      await this.hotelUsersRepository.delete({ id: user.id });

      if (error instanceof IdentityUserConflictError) {
        throw new ConflictException(error.message);
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
