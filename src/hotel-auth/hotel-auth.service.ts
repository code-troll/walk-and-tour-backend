import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { VerifiedAuth0Claims } from '../admin-auth/auth0-token-verifier.service';
import { HotelTourEntity } from '../hotels/entities/hotel-tour.entity';
import { HotelUserEntity } from '../hotels/entities/hotel-user.entity';
import { HOTEL_USER_STATUSES, HotelUserStatus } from '../shared/domain';
import { AuthenticatedHotelUser } from './authenticated-hotel-user.interface';

@Injectable()
export class HotelAuthService {
  constructor(
    @InjectRepository(HotelUserEntity)
    private readonly hotelUsersRepository: Repository<HotelUserEntity>,
    @InjectRepository(HotelTourEntity)
    private readonly hotelToursRepository: Repository<HotelTourEntity>,
  ) {}

  /**
   * The signed-in hotel's own view of itself.
   *
   * Every field comes from the resolved token. Nothing here reads an identifier
   * supplied by the caller, and only live tour grants are listed, so a revoked
   * tour disappears from the portal without touching its history.
   */
  async getViewer(hotelUser: AuthenticatedHotelUser) {
    const grants = await this.hotelToursRepository.find({
      where: { hotelId: hotelUser.hotelId, revokedAt: IsNull() },
      relations: { tour: true },
      order: { grantedAt: 'ASC' },
    });

    return {
      hotel: {
        id: hotelUser.hotelId,
        name: hotelUser.hotelName,
      },
      user: {
        username: hotelUser.username,
        email: hotelUser.email,
        status: hotelUser.status,
      },
      tours: grants.map((grant) => ({
        tourId: grant.tourId,
        tourName: grant.tour?.name ?? '',
      })),
    };
  }

  /**
   * Resolves a verified token to the hotel user it belongs to.
   *
   * Lookup is by subject only. There is deliberately no fallback to matching on
   * email: the subject is recorded when the identity is created, so it is always
   * available, and an email fallback is exactly what would let an identity from
   * another connection claim someone else's account.
   */
  async resolveAuthenticatedHotelUser(
    claims: VerifiedAuth0Claims,
  ): Promise<AuthenticatedHotelUser> {
    const hotelUser = await this.hotelUsersRepository.findOne({
      where: { identityUserId: claims.sub },
      relations: { hotel: true },
    });

    if (!hotelUser) {
      throw new UnauthorizedException(
        'No hotel access user is mapped to this identity.',
      );
    }

    if (
      !HOTEL_USER_STATUSES.includes(hotelUser.status as HotelUserStatus)
    ) {
      throw new ForbiddenException('Hotel access user status is invalid.');
    }

    if (hotelUser.status === 'disabled') {
      throw new ForbiddenException('This hotel access user is disabled.');
    }

    if (!hotelUser.hotel) {
      throw new UnauthorizedException(
        'No hotel is mapped to this hotel access user.',
      );
    }

    if (hotelUser.hotel.status === 'disabled') {
      throw new ForbiddenException('This hotel account is disabled.');
    }

    // Reaching this point with a valid token proves the hotel completed the
    // password setup, because the identity provider would not have issued one
    // otherwise. `invited` therefore means "has never signed in", and the first
    // successful sign-in is what settles it.
    const status: HotelUserStatus = 'active';

    await this.hotelUsersRepository.update(
      { id: hotelUser.id },
      { lastLoginAt: new Date(), status },
    );

    return {
      id: hotelUser.id,
      hotelId: hotelUser.hotelId,
      hotelName: hotelUser.hotel.name,
      username: hotelUser.username,
      email: hotelUser.email,
      status,
      identityUserId: claims.sub,
    };
  }
}
