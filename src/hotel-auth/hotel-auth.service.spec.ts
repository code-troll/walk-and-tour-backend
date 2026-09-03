import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { HotelTourEntity } from '../hotels/entities/hotel-tour.entity';
import { HotelUserEntity } from '../hotels/entities/hotel-user.entity';
import { HotelAuthService } from './hotel-auth.service';

const buildHotelUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'user-1',
    hotelId: 'hotel-1',
    username: 'hotel-soeborg-strand',
    email: 'reception@example.com',
    identityUserId: 'auth0|hotel',
    status: 'invited',
    hotel: { id: 'hotel-1', name: 'Hotel Søborg Strand', status: 'active' },
    ...overrides,
  }) as unknown as HotelUserEntity;

describe('HotelAuthService', () => {
  let service: HotelAuthService;
  let hotelUsersRepository: RepositoryMock<HotelUserEntity>;
  let hotelToursRepository: RepositoryMock<HotelTourEntity>;

  beforeEach(() => {
    hotelUsersRepository = createRepositoryMock<HotelUserEntity>();
    hotelToursRepository = createRepositoryMock<HotelTourEntity>();
    service = new HotelAuthService(
      hotelUsersRepository as never,
      hotelToursRepository as never,
    );
  });

  describe('resolveAuthenticatedHotelUser', () => {
    it('resolves by subject only, never by email', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(buildHotelUser({ status: 'active' }));

      const user = await service.resolveAuthenticatedHotelUser({
        sub: 'auth0|hotel',
        email: 'someone-else@example.com',
      });

      expect(hotelUsersRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { identityUserId: 'auth0|hotel' } }),
      );
      expect(user.hotelId).toBe('hotel-1');
    });

    it('rejects an identity with no hotel access user', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resolveAuthenticatedHotelUser({ sub: 'auth0|admin' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a disabled access user', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(
        buildHotelUser({ status: 'disabled' }),
      );

      await expect(
        service.resolveAuthenticatedHotelUser({ sub: 'auth0|hotel' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a user whose hotel account is disabled', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(
        buildHotelUser({
          status: 'active',
          hotel: { id: 'hotel-1', name: 'Hotel', status: 'disabled' },
        }),
      );

      await expect(
        service.resolveAuthenticatedHotelUser({ sub: 'auth0|hotel' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('settles an invited user as active on its first sign-in', async () => {
      hotelUsersRepository.findOne.mockResolvedValue(buildHotelUser({ status: 'invited' }));

      const user = await service.resolveAuthenticatedHotelUser({ sub: 'auth0|hotel' });

      expect(user.status).toBe('active');
      expect(hotelUsersRepository.update).toHaveBeenCalledWith(
        { id: 'user-1' },
        expect.objectContaining({ status: 'active', lastLoginAt: expect.any(Date) }),
      );
    });
  });

  describe('getViewer', () => {
    it('lists only live grants and never reads a caller-supplied hotel', async () => {
      hotelToursRepository.find.mockResolvedValue([
        { tourId: 'tour-1', tour: { name: 'Historic Center' } },
      ] as never);

      const viewer = await service.getViewer({
        id: 'user-1',
        hotelId: 'hotel-1',
        hotelName: 'Hotel Søborg Strand',
        username: 'hotel-soeborg-strand',
        email: 'reception@example.com',
        status: 'active',
        identityUserId: 'auth0|hotel',
      });

      expect(hotelToursRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hotelId: 'hotel-1' }),
        }),
      );
      expect(viewer.hotel).toEqual({ id: 'hotel-1', name: 'Hotel Søborg Strand' });
      expect(viewer.tours).toEqual([{ tourId: 'tour-1', tourName: 'Historic Center' }]);
    });
  });
});
