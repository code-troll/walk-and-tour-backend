import { ConflictException, NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { TourEntity } from '../tours/entities/tour.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelEntity } from './entities/hotel.entity';
import { HotelsService } from './hotels.service';

const admin: AuthenticatedAdmin = {
  id: 'admin-1',
  email: 'admin@example.com',
  roleName: 'super_admin',
  status: 'active',
  auth0UserId: 'auth0|admin',
};

const buildHotel = (overrides: Partial<HotelEntity> = {}): HotelEntity =>
  ({
    id: 'hotel-1',
    name: 'Copenhagen Admiral Hotel',
    address: 'Toldbodgade 24-28',
    phone: '+45 33 74 14 14',
    email: 'reception@example.com',
    cvr: '12345678',
    status: 'active',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as HotelEntity;

describe('HotelsService', () => {
  let service: HotelsService;
  let hotelsRepository: RepositoryMock<HotelEntity>;
  let hotelToursRepository: RepositoryMock<HotelTourEntity>;
  let toursRepository: RepositoryMock<TourEntity>;
  let bookingsRepository: { count: jest.Mock };
  let hotelUsersService: { release: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let grantsManagerRepository: {
    find: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
  };
  let hotelsManagerRepository: { update: jest.Mock };

  beforeEach(() => {
    hotelsRepository = createRepositoryMock<HotelEntity>();
    hotelToursRepository = createRepositoryMock<HotelTourEntity>();
    toursRepository = createRepositoryMock<TourEntity>();

    grantsManagerRepository = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    hotelsManagerRepository = { update: jest.fn().mockResolvedValue(undefined) };

    bookingsRepository = { count: jest.fn().mockResolvedValue(0) };

    hotelUsersService = { release: jest.fn().mockResolvedValue(undefined) };

    dataSource = {
      transaction: jest.fn(async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: (entity: unknown) =>
            entity === HotelTourEntity ? grantsManagerRepository : hotelsManagerRepository,
        }),
      ),
    };

    service = new HotelsService(
      hotelsRepository as never,
      hotelToursRepository as never,
      toursRepository as never,
      bookingsRepository as never,
      hotelUsersService as never,
      dataSource as never,
    );

    hotelToursRepository.find.mockResolvedValue([]);
  });

  describe('create', () => {
    it('normalizes the hotel details and records the acting admin', async () => {
      hotelsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildHotel());
      hotelsRepository.save.mockImplementation(async (value: HotelEntity) => ({
        ...value,
        id: 'hotel-1',
      }));

      await service.create(
        {
          name: '  Copenhagen Admiral Hotel  ',
          address: '  Toldbodgade 24-28  ',
          phone: ' +45 33 74 14 14 ',
          email: '  Reception@Example.COM ',
          cvr: '12345678',
        },
        admin,
      );

      expect(hotelsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Copenhagen Admiral Hotel',
          address: 'Toldbodgade 24-28',
          phone: '+45 33 74 14 14',
          email: 'reception@example.com',
          status: 'active',
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        }),
      );
    });

    it('rejects a CVR number that is already registered', async () => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel());

      await expect(
        service.create(
          {
            name: 'Another Hotel',
            address: 'Somewhere 1',
            phone: '+45 11 11 11 11',
            email: 'other@example.com',
            cvr: '12345678',
          },
          admin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(hotelsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findOneOrThrow', () => {
    it('reports a missing hotel as not found', async () => {
      hotelsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneOrThrow('hotel-404')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists only live grants', async () => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel());
      hotelToursRepository.find.mockResolvedValue([
        {
          tourId: 'tour-1',
          tour: { name: 'Historic Center' },
          grantedAt: new Date('2026-02-01T00:00:00.000Z'),
          grantedBy: 'admin-1',
        },
      ] as never);

      const hotel = await service.findOneOrThrow('hotel-1');

      expect(hotelToursRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hotelId: 'hotel-1' }),
        }),
      );
      expect(hotel.tours).toEqual([
        {
          tourId: 'tour-1',
          tourName: 'Historic Center',
          grantedAt: new Date('2026-02-01T00:00:00.000Z'),
          grantedBy: 'admin-1',
          priceAmount: null,
          tourPriceAmount: null,
          currency: 'DKK',
        },
      ]);
    });
  });

  describe('archive', () => {
    beforeEach(() => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel());
    });

    it('releases the access user before the status changes', async () => {
      const orden: string[] = [];
      hotelUsersService.release.mockImplementation(async () => {
        orden.push('release');
      });
      grantsManagerRepository.update.mockImplementation(async () => {
        orden.push('grants');
      });

      await service.archive('hotel-1', admin);

      // A failure while releasing has to leave an active hotel that still has
      // its user, not an archived one that can still sign in.
      expect(orden[0]).toBe('release');
      expect(hotelUsersService.release).toHaveBeenCalledWith('hotel-1');
    });

    it('revokes the live grants rather than deleting them', async () => {
      await service.archive('hotel-1', admin);

      expect(grantsManagerRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ hotelId: 'hotel-1' }),
        expect.objectContaining({ revokedBy: 'admin-1', revokedAt: expect.any(Date) }),
      );
    });

    it('does nothing to a hotel that is already archived', async () => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel({ status: 'archived' }));

      await service.archive('hotel-1', admin);

      expect(hotelUsersService.release).not.toHaveBeenCalled();
      expect(grantsManagerRepository.update).not.toHaveBeenCalled();
    });

    it('refuses a hotel that does not exist', async () => {
      hotelsRepository.findOne.mockResolvedValue(null);

      await expect(service.archive('missing', admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel());
    });

    it('refuses a hotel that has bookings, and says to archive it', async () => {
      bookingsRepository.count.mockResolvedValue(3);

      await expect(service.remove('hotel-1')).rejects.toThrow(/3 booking\(s\).*Archive/s);

      expect(hotelUsersService.release).not.toHaveBeenCalled();
      expect(hotelsRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes the identity before the row it is recorded in', async () => {
      const orden: string[] = [];
      hotelUsersService.release.mockImplementation(async () => {
        orden.push('release');
      });
      hotelsRepository.delete.mockImplementation(async () => {
        orden.push('delete');
        return { affected: 1 } as never;
      });

      await service.remove('hotel-1');

      // `hotel_users` cascades from `hotels`: deleting the hotel first would
      // drop the only record of which identity to remove.
      expect(orden).toEqual(['release', 'delete']);
    });
  });

  describe('setTours', () => {
    beforeEach(() => {
      hotelsRepository.findOne.mockResolvedValue(buildHotel());
    });

    it('grants the tours that are new and leaves existing grants untouched', async () => {
      toursRepository.find.mockResolvedValue([
        { id: 'tour-1' },
        { id: 'tour-2' },
      ] as never);
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1', priceAmount: null },
      ] as never);

      await service.setTours('hotel-1', { tours: [{ tourId: 'tour-1' }, { tourId: 'tour-2' }] }, admin);

      expect(grantsManagerRepository.insert).toHaveBeenCalledWith([
        {
          hotelId: 'hotel-1',
          tourId: 'tour-2',
          grantedBy: 'admin-1',
          priceAmount: null,
        },
      ]);
      expect(grantsManagerRepository.update).not.toHaveBeenCalled();
    });

    it('revokes a dropped tour instead of deleting the grant', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1' },
        { id: 'grant-2', tourId: 'tour-2' },
      ] as never);

      await service.setTours('hotel-1', { tours: [{ tourId: 'tour-1' }] }, admin);

      expect(grantsManagerRepository.update).toHaveBeenCalledWith(
        { id: expect.objectContaining({ _value: ['grant-2'] }) },
        expect.objectContaining({ revokedBy: 'admin-1', revokedAt: expect.any(Date) }),
      );
      expect(grantsManagerRepository.insert).not.toHaveBeenCalled();
    });

    it('revokes every grant when the list is emptied', async () => {
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1' },
      ] as never);

      await service.setTours('hotel-1', { tours: [] }, admin);

      expect(grantsManagerRepository.update).toHaveBeenCalledTimes(1);
      expect(grantsManagerRepository.insert).not.toHaveBeenCalled();
      expect(toursRepository.find).not.toHaveBeenCalled();
    });

    it('stores the partner price on a new grant', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);
      grantsManagerRepository.find.mockResolvedValue([] as never);

      await service.setTours(
        'hotel-1',
        { tours: [{ tourId: 'tour-1', priceAmount: '199.00' }] },
        admin,
      );

      expect(grantsManagerRepository.insert).toHaveBeenCalledWith([
        {
          hotelId: 'hotel-1',
          tourId: 'tour-1',
          grantedBy: 'admin-1',
          priceAmount: '199.00',
        },
      ]);
    });

    it('reprices a grant in place rather than re-granting it', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1', priceAmount: '199.00' },
      ] as never);

      await service.setTours(
        'hotel-1',
        { tours: [{ tourId: 'tour-1', priceAmount: '149.00' }] },
        admin,
      );

      // `granted_at` is history: repricing must not rewrite when the partner
      // was given the tour.
      expect(grantsManagerRepository.insert).not.toHaveBeenCalled();
      expect(grantsManagerRepository.update).toHaveBeenCalledWith(
        { id: 'grant-1' },
        { priceAmount: '149.00' },
      );
    });

    it('clearing the price returns the partner to the tour price', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1', priceAmount: '149.00' },
      ] as never);

      await service.setTours('hotel-1', { tours: [{ tourId: 'tour-1' }] }, admin);

      expect(grantsManagerRepository.update).toHaveBeenCalledWith(
        { id: 'grant-1' },
        { priceAmount: null },
      );
    });

    it('leaves an unchanged price alone', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);
      grantsManagerRepository.find.mockResolvedValue([
        { id: 'grant-1', tourId: 'tour-1', priceAmount: '199.00' },
      ] as never);

      await service.setTours(
        'hotel-1',
        { tours: [{ tourId: 'tour-1', priceAmount: '199.00' }] },
        admin,
      );

      expect(grantsManagerRepository.update).not.toHaveBeenCalled();
      expect(grantsManagerRepository.insert).not.toHaveBeenCalled();
    });

    it('refuses to grant a tour that does not exist', async () => {
      toursRepository.find.mockResolvedValue([{ id: 'tour-1' }] as never);

      await expect(
        service.setTours('hotel-1', { tours: [{ tourId: 'tour-1' }, { tourId: 'tour-missing' }] }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('reports a missing hotel as not found', async () => {
      hotelsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setTours('hotel-404', { tours: [] }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
