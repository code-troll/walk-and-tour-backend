import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { TourEntity } from '../tours/entities/tour.entity';
import { HotelBookingLineItemEntity } from './entities/hotel-booking-line-item.entity';
import { HotelBookingLogEntity } from './entities/hotel-booking-log.entity';
import { HotelBookingEntity } from './entities/hotel-booking.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { BookingActor, HotelBookingsService } from './hotel-bookings.service';

const hotelActor: BookingActor = {
  type: 'hotel',
  label: 'Hotel Søborg Strand',
  hotelUserId: 'hotel-user-1',
};
const adminActor: BookingActor = {
  type: 'admin',
  label: 'admin@example.com',
  adminUserId: 'admin-1',
};

const buildBooking = (overrides: Partial<HotelBookingEntity> = {}) =>
  ({
    id: 'booking-1',
    hotelId: 'hotel-1',
    tourId: 'tour-1',
    status: 'pending',
    currency: 'DKK',
    participantCount: 2,
    unitPriceAmount: '250.00',
    totalAmount: '500.00',
    lineItems: [],
    logs: [],
    ...overrides,
  }) as unknown as HotelBookingEntity;

describe('HotelBookingsService', () => {
  let service: HotelBookingsService;
  let bookingsRepository: RepositoryMock<HotelBookingEntity>;
  let hotelToursRepository: RepositoryMock<HotelTourEntity>;
  let toursRepository: RepositoryMock<TourEntity>;
  let lineItems: { find: jest.Mock; insert: jest.Mock; delete: jest.Mock };
  let logs: { create: jest.Mock; save: jest.Mock };
  let managerBookings: { update: jest.Mock; create: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    bookingsRepository = createRepositoryMock<HotelBookingEntity>();
    hotelToursRepository = createRepositoryMock<HotelTourEntity>();
    toursRepository = createRepositoryMock<TourEntity>();

    lineItems = {
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    logs = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    managerBookings = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: 'booking-1',
      })),
    };

    dataSource = {
      transaction: jest.fn(async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === HotelBookingLineItemEntity) return lineItems;
            if (entity === HotelBookingLogEntity) return logs;
            return managerBookings;
          },
          query: jest.fn().mockResolvedValue([{ max: null }]),
        }),
      ),
    };

    service = new HotelBookingsService(
      bookingsRepository as never,
      hotelToursRepository as never,
      toursRepository as never,
      dataSource as never,
    );
  });

  describe('findOneOrThrow', () => {
    it('scopes the query by hotel rather than filtering afterwards', async () => {
      bookingsRepository.findOne.mockResolvedValue(buildBooking());

      await service.findOneOrThrow('booking-1', 'hotel-1');

      expect(bookingsRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'booking-1', hotelId: 'hotel-1' } }),
      );
    });

    it("reports another hotel's booking as not found, not forbidden", async () => {
      bookingsRepository.findOne.mockResolvedValue(null);

      const error = await service
        .findOneOrThrow('booking-1', 'other-hotel')
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(NotFoundException);
      // The message must not hint that the booking exists elsewhere.
      expect((error as Error).message).toBe('Booking not found.');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      hotelToursRepository.findOne.mockResolvedValue({ id: 'grant-1' } as never);
      toursRepository.findOne.mockResolvedValue({
        id: 'tour-1',
        name: 'Historic Center',
        priceAmount: '250.00',
      } as never);
      bookingsRepository.findOne.mockResolvedValue(buildBooking());
    });

    it('refuses a tour the hotel has not been granted', async () => {
      hotelToursRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create('hotel-1', baseInput(), hotelActor),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('only considers grants that are still live', async () => {
      await service.create('hotel-1', baseInput(), hotelActor);

      expect(hotelToursRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ hotelId: 'hotel-1', tourId: 'tour-1' }),
        }),
      );
    });

    it('opens the booking with the tour as its base line, priced per person', async () => {
      await service.create('hotel-1', baseInput({ participantCount: 3 }), hotelActor);

      expect(lineItems.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'base',
          description: 'Historic Center × 3',
          amount: '750.00',
          orderIndex: 0,
        }),
      );
    });

    it('charges the partner price when the grant sets one', async () => {
      hotelToursRepository.findOne.mockResolvedValue({
        id: 'grant-1',
        priceAmount: '100.00',
      } as never);

      await service.create('hotel-1', baseInput({ participantCount: 3 }), hotelActor);

      expect(lineItems.insert).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '300.00' }),
      );
      expect(managerBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ unitPriceAmount: '100.00' }),
      );
    });

    it('falls through to the tour price when the grant sets none', async () => {
      hotelToursRepository.findOne.mockResolvedValue({
        id: 'grant-1',
        priceAmount: null,
      } as never);

      await service.create('hotel-1', baseInput({ participantCount: 2 }), hotelActor);

      expect(managerBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ unitPriceAmount: '250.00' }),
      );
    });

    it("writes the booking in the tour's currency", async () => {
      toursRepository.findOne.mockResolvedValue({
        id: 'tour-1',
        name: 'Historic Center',
        priceAmount: '250.00',
        priceCurrency: 'EUR',
      } as never);

      await service.create('hotel-1', baseInput(), hotelActor);

      expect(managerBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR' }),
      );
    });

    it('falls back to DKK when the tour names no currency it recognises', async () => {
      toursRepository.findOne.mockResolvedValue({
        id: 'tour-1',
        name: 'Historic Center',
        priceAmount: '250.00',
        // `tours.price_currency` is nullable varchar(10), so it holds whatever
        // an editor typed. `hotel_bookings.currency` is char(3): a longer value
        // has to be stopped here rather than at the insert.
        priceCurrency: 'kroner',
      } as never);

      await service.create('hotel-1', baseInput(), hotelActor);

      expect(managerBookings.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'DKK' }),
      );
    });

    it('starts a tour with no price without a base line', async () => {
      toursRepository.findOne.mockResolvedValue({
        id: 'tour-1',
        name: 'Tip Based Tour',
        priceAmount: null,
      } as never);

      await service.create('hotel-1', baseInput(), hotelActor);

      expect(lineItems.insert).not.toHaveBeenCalled();
      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        { totalAmount: null },
      );
    });

    it('records who created it', async () => {
      await service.create('hotel-1', baseInput(), hotelActor);

      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'created',
          toStatus: 'pending',
          actorType: 'hotel',
          actorLabel: 'Hotel Søborg Strand',
        }),
      );
    });
  });

  describe('changeStatus', () => {
    it('refuses a transition this actor may not make', async () => {
      bookingsRepository.findOne.mockResolvedValue(buildBooking({ status: 'pending' }));

      await expect(
        service.changeStatus({ id: 'booking-1', to: 'confirmed', actor: hotelActor }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('stamps the matching timestamp and logs the move', async () => {
      bookingsRepository.findOne.mockResolvedValue(buildBooking({ status: 'pending' }));

      await service.changeStatus({ id: 'booking-1', to: 'confirmed', actor: adminActor });

      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        expect.objectContaining({ status: 'confirmed', confirmedAt: expect.any(Date) }),
      );
      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_changed',
          fromStatus: 'pending',
          toStatus: 'confirmed',
        }),
      );
    });

    it('keeps the cancellation reason', async () => {
      bookingsRepository.findOne.mockResolvedValue(buildBooking({ status: 'pending' }));

      await service.changeStatus({
        id: 'booking-1',
        to: 'cancelled',
        actor: hotelActor,
        reason: 'Guest changed plans',
      });

      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        expect.objectContaining({ cancellationReason: 'Guest changed plans' }),
      );
    });

    it('refuses to move a booking out of a terminal status', async () => {
      bookingsRepository.findOne.mockResolvedValue(buildBooking({ status: 'invoiced' }));

      await expect(
        service.changeStatus({ id: 'booking-1', to: 'completed', actor: adminActor }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('line items', () => {
    it('adds an extra and recomputes the total from all the lines', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({
          status: 'confirmed',
          lineItems: [{ id: 'line-1', kind: 'base', amount: '500.00', orderIndex: 0 }],
        } as never),
      );
      lineItems.find.mockResolvedValue([
        { amount: '500.00' },
        { amount: '150.50' },
      ] as never);

      await service.addLineItem({
        id: 'booking-1',
        description: 'Private guide surcharge',
        amount: '150.50',
        actor: adminActor,
      });

      expect(lineItems.insert).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'extra', orderIndex: 1 }),
      );
      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        { totalAmount: '650.50' },
      );
    });

    it('supports a negative line as a discount', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({ status: 'confirmed' }),
      );
      lineItems.find.mockResolvedValue([
        { amount: '500.00' },
        { amount: '-100.00' },
      ] as never);

      await service.addLineItem({
        id: 'booking-1',
        description: 'Loyalty discount',
        amount: '-100.00',
        actor: adminActor,
      });

      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        { totalAmount: '400.00' },
      );
    });

    it.each([['invoiced'], ['cancelled']])(
      'freezes the amounts on a %s booking',
      async (status) => {
        bookingsRepository.findOne.mockResolvedValue(buildBooking({ status }));

        await expect(
          service.addLineItem({
            id: 'booking-1',
            description: 'Late extra',
            amount: '50.00',
            actor: adminActor,
          }),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(lineItems.insert).not.toHaveBeenCalled();
      },
    );

    it('refuses to remove the tour line', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({
          status: 'confirmed',
          lineItems: [{ id: 'line-1', kind: 'base', amount: '500.00', orderIndex: 0 }],
        } as never),
      );

      await expect(
        service.removeLineItem({
          id: 'booking-1',
          lineItemId: 'line-1',
          actor: adminActor,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('removes an extra and logs what it was', async () => {
      bookingsRepository.findOne.mockResolvedValue(
        buildBooking({
          status: 'confirmed',
          lineItems: [
            { id: 'line-1', kind: 'base', amount: '500.00', orderIndex: 0 },
            { id: 'line-2', kind: 'extra', amount: '150.50', description: 'Surcharge', orderIndex: 1 },
          ],
        } as never),
      );
      lineItems.find.mockResolvedValue([{ amount: '500.00' }] as never);

      await service.removeLineItem({
        id: 'booking-1',
        lineItemId: 'line-2',
        actor: adminActor,
      });

      expect(lineItems.delete).toHaveBeenCalledWith({ id: 'line-2' });
      expect(managerBookings.update).toHaveBeenCalledWith(
        { id: 'booking-1' },
        { totalAmount: '500.00' },
      );
      expect(logs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'line_item_removed',
          metadata: expect.objectContaining({ description: 'Surcharge' }),
        }),
      );
    });
  });
});

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    tourId: 'tour-1',
    scheduledFor: new Date('2026-10-01T10:00:00.000Z'),
    languageCode: 'en',
    participantCount: 2,
    guestName: 'Guest Name',
    ...overrides,
  } as never;
}
