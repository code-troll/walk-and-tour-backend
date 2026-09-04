import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';

import { TourEntity } from '../tours/entities/tour.entity';
import {
  canTransition,
  DEFAULT_HOTEL_BOOKING_CURRENCY,
  EDITABLE_HOTEL_BOOKING_STATUSES,
  HotelBookingActorType,
  HotelBookingStatus,
} from '../shared/domain';
import { HotelBookingLineItemEntity } from './entities/hotel-booking-line-item.entity';
import { HotelBookingLogEntity } from './entities/hotel-booking-log.entity';
import { HotelBookingEntity } from './entities/hotel-booking.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { multiplyAmount, sumAmounts } from './money';

export interface BookingActor {
  type: HotelBookingActorType;
  label: string;
  hotelUserId?: string;
  adminUserId?: string;
}

export interface CreateHotelBookingInput {
  tourId: string;
  scheduledFor: Date;
  languageCode: string;
  participantCount: number;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  roomNumber?: string | null;
  notes?: string | null;
}

@Injectable()
export class HotelBookingsService {
  constructor(
    @InjectRepository(HotelBookingEntity)
    private readonly bookingsRepository: Repository<HotelBookingEntity>,
    @InjectRepository(HotelTourEntity)
    private readonly hotelToursRepository: Repository<HotelTourEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Shapes a booking for either audience.
   *
   * `isEstimate` is returned as data rather than left to each client to infer,
   * so the portal's "subject to adjustment" notice is driven by the same rule
   * everywhere and disappears the moment the booking is invoiced.
   */
  toView(booking: HotelBookingEntity) {
    return {
      id: booking.id,
      reference: booking.reference,
      hotelId: booking.hotelId,
      tourId: booking.tourId,
      tourName: booking.tourNameSnapshot,
      scheduledFor: booking.scheduledFor,
      languageCode: booking.languageCode,
      participantCount: booking.participantCount,
      guest: {
        name: booking.guestName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
        roomNumber: booking.roomNumber,
      },
      notes: booking.notes,
      status: booking.status,
      currency: booking.currency,
      unitPriceAmount: booking.unitPriceAmount,
      totalAmount: booking.totalAmount,
      isEstimate: booking.invoicedAt === null,
      cancellationReason: booking.cancellationReason,
      lineItems: (booking.lineItems ?? []).map((item) => ({
        id: item.id,
        kind: item.kind,
        description: item.description,
        amount: item.amount,
      })),
      logs: (booking.logs ?? []).map((log) => ({
        id: log.id,
        type: log.type,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        actorType: log.actorType,
        actorLabel: log.actorLabel,
        reason: log.reason,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      timestamps: {
        confirmedAt: booking.confirmedAt,
        completedAt: booking.completedAt,
        cancelledAt: booking.cancelledAt,
        invoicedAt: booking.invoicedAt,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    };
  }

  /** Lists bookings, always scoped by hotel when the caller is one. */
  async findAll({
    hotelId,
    status,
    page = 1,
    limit = 25,
  }: {
    hotelId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const [items, total] = await this.bookingsRepository.findAndCount({
      where: {
        ...(hotelId ? { hotelId } : {}),
        ...(status ? { status } : {}),
      },
      relations: { lineItems: true },
      order: { scheduledFor: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: items.map((booking) => this.toView(booking)),
      page,
      limit,
      total,
    };
  }

  /**
   * Loads one booking, scoped to a hotel when the caller is one.
   *
   * The scope goes into the WHERE rather than being checked after the fact, and
   * a miss is reported as not found rather than forbidden: telling one hotel
   * that another hotel's booking exists is itself a leak.
   */
  async findOneOrThrow(id: string, hotelId?: string): Promise<HotelBookingEntity> {
    const booking = await this.bookingsRepository.findOne({
      where: hotelId ? { id, hotelId } : { id },
      relations: { lineItems: true, logs: true },
      order: { lineItems: { orderIndex: 'ASC' }, logs: { createdAt: 'ASC' } },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    return booking;
  }

  async create(
    hotelId: string,
    input: CreateHotelBookingInput,
    actor: BookingActor,
  ): Promise<HotelBookingEntity> {
    // A hotel may only book a tour it has been granted, and only while that
    // grant is live. This is re-checked here rather than trusted from the
    // caller's own list of tours.
    const grant = await this.hotelToursRepository.findOne({
      where: { hotelId, tourId: input.tourId, revokedAt: IsNull() },
    });

    if (!grant) {
      throw new ForbiddenException('This tour is not available to this hotel.');
    }

    const tour = await this.toursRepository.findOne({ where: { id: input.tourId } });

    if (!tour) {
      throw new NotFoundException('Booking not found.');
    }

    const bookingId = await this.dataSource.transaction(async (manager) => {
      const bookings = manager.getRepository(HotelBookingEntity);

      const unitPriceAmount = tour.priceAmount;
      const booking = await bookings.save(
        bookings.create({
          reference: await this.nextReference(manager),
          hotelId,
          tourId: tour.id,
          tourNameSnapshot: tour.name,
          scheduledFor: input.scheduledFor,
          languageCode: input.languageCode,
          participantCount: input.participantCount,
          guestName: input.guestName.trim(),
          guestEmail: input.guestEmail?.trim() || null,
          guestPhone: input.guestPhone?.trim() || null,
          roomNumber: input.roomNumber?.trim() || null,
          notes: input.notes?.trim() || null,
          status: 'pending',
          currency: DEFAULT_HOTEL_BOOKING_CURRENCY,
          unitPriceAmount,
          totalAmount: null,
          createdByHotelUserId: actor.hotelUserId ?? null,
          createdByAdminUserId: actor.adminUserId ?? null,
        }),
      );

      // The tour itself is a line item, so the total is the sum of the lines
      // under one rule. A tour with no price starts with no base line, and the
      // booking reads as "price on request" until an administrator adds one.
      if (unitPriceAmount !== null) {
        await manager.getRepository(HotelBookingLineItemEntity).insert({
          bookingId: booking.id,
          kind: 'base',
          description: `${tour.name} × ${input.participantCount}`,
          amount: multiplyAmount(unitPriceAmount, input.participantCount),
          orderIndex: 0,
          createdBy: actor.hotelUserId ?? actor.adminUserId ?? null,
        });
      }

      await this.recomputeTotal(manager, booking.id);
      await this.appendLog(manager, {
        bookingId: booking.id,
        type: 'created',
        toStatus: 'pending',
        actor,
      });

      return booking.id;
    });

    // Read after the transaction commits. `findOneOrThrow` goes through the
    // repository rather than the transaction's manager, so reading inside would
    // return the state from before the write.
    return this.findOneOrThrow(bookingId);
  }

  /**
   * The only way a booking changes status.
   *
   * Controllers name an action; the transition table decides whether this actor
   * may take it. No status ever arrives from a request body.
   */
  async changeStatus({
    id,
    to,
    actor,
    hotelId,
    reason,
  }: {
    id: string;
    to: HotelBookingStatus;
    actor: BookingActor;
    hotelId?: string;
    reason?: string | null;
  }): Promise<HotelBookingEntity> {
    const booking = await this.findOneOrThrow(id, hotelId);
    const from = booking.status as HotelBookingStatus;

    if (!canTransition({ from, to, actorType: actor.type })) {
      throw new ConflictException(
        `A booking that is ${from} cannot be moved to ${to} by ${
          actor.type === 'hotel' ? 'the hotel' : 'an administrator'
        }.`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const timestamps: {
        confirmedAt?: Date;
        completedAt?: Date;
        invoicedAt?: Date;
        cancelledAt?: Date;
        cancellationReason?: string | null;
      } = {};

      if (to === 'confirmed') timestamps.confirmedAt = new Date();
      if (to === 'completed') timestamps.completedAt = new Date();
      if (to === 'invoiced') timestamps.invoicedAt = new Date();
      if (to === 'cancelled') {
        timestamps.cancelledAt = new Date();
        timestamps.cancellationReason = reason ?? null;
      }

      await manager
        .getRepository(HotelBookingEntity)
        .update({ id }, { status: to, ...timestamps });

      await this.appendLog(manager, {
        bookingId: id,
        type: 'status_changed',
        fromStatus: from,
        toStatus: to,
        actor,
        reason,
      });
    });

    return this.findOneOrThrow(id, hotelId);
  }

  async addLineItem({
    id,
    description,
    amount,
    actor,
  }: {
    id: string;
    description: string;
    amount: string;
    actor: BookingActor;
  }): Promise<HotelBookingEntity> {
    const booking = await this.findOneOrThrow(id);
    this.assertMoneyIsEditable(booking);

    await this.dataSource.transaction(async (manager) => {
      const nextOrderIndex =
        booking.lineItems.reduce((max, item) => Math.max(max, item.orderIndex), 0) + 1;

      await manager.getRepository(HotelBookingLineItemEntity).insert({
        bookingId: id,
        kind: 'extra',
        description: description.trim(),
        amount,
        orderIndex: nextOrderIndex,
        createdBy: actor.adminUserId ?? null,
      });

      const total = await this.recomputeTotal(manager, id);
      await this.appendLog(manager, {
        bookingId: id,
        type: 'line_item_added',
        actor,
        metadata: { description: description.trim(), amount, total },
      });
    });

    return this.findOneOrThrow(id);
  }

  async removeLineItem({
    id,
    lineItemId,
    actor,
  }: {
    id: string;
    lineItemId: string;
    actor: BookingActor;
  }): Promise<HotelBookingEntity> {
    const booking = await this.findOneOrThrow(id);
    this.assertMoneyIsEditable(booking);

    const lineItem = booking.lineItems.find((item) => item.id === lineItemId);

    if (!lineItem) {
      throw new NotFoundException('Line item not found.');
    }

    if (lineItem.kind === 'base') {
      throw new ConflictException(
        'The tour line cannot be removed. Cancel the booking instead.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(HotelBookingLineItemEntity).delete({ id: lineItemId });

      const total = await this.recomputeTotal(manager, id);
      await this.appendLog(manager, {
        bookingId: id,
        type: 'line_item_removed',
        actor,
        metadata: {
          description: lineItem.description,
          amount: lineItem.amount,
          total,
        },
      });
    });

    return this.findOneOrThrow(id);
  }

  /**
   * Recomputes and stores the total. The single place that decides what a
   * booking costs, so the stored figure and the line items cannot drift.
   */
  private async recomputeTotal(
    manager: EntityManager,
    bookingId: string,
  ): Promise<string | null> {
    const lineItems = await manager.getRepository(HotelBookingLineItemEntity).find({
      where: { bookingId },
    });

    const total = lineItems.length > 0 ? sumAmounts(lineItems.map((item) => item.amount)) : null;

    await manager
      .getRepository(HotelBookingEntity)
      .update({ id: bookingId }, { totalAmount: total });

    return total;
  }

  private assertMoneyIsEditable(booking: HotelBookingEntity): void {
    if (
      !EDITABLE_HOTEL_BOOKING_STATUSES.includes(booking.status as HotelBookingStatus)
    ) {
      throw new ConflictException(
        booking.status === 'invoiced'
          ? 'This booking has been invoiced, so its amounts can no longer be changed.'
          : 'This booking has been cancelled, so its amounts can no longer be changed.',
      );
    }
  }

  private async appendLog(
    manager: EntityManager,
    {
      bookingId,
      type,
      fromStatus,
      toStatus,
      actor,
      reason,
      metadata,
    }: {
      bookingId: string;
      type: string;
      fromStatus?: string | null;
      toStatus?: string | null;
      actor: BookingActor;
      reason?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    const logs = manager.getRepository(HotelBookingLogEntity);

    await logs.save(
      logs.create({
        bookingId,
        type,
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorType: actor.type,
        actorHotelUserId: actor.hotelUserId ?? null,
        actorAdminUserId: actor.adminUserId ?? null,
        actorLabel: actor.label,
        reason: reason ?? null,
        metadata: metadata ?? null,
      }),
    );
  }

  /** Human-readable and dictatable over the phone: `WT-2026-0042`. */
  private async nextReference(manager: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WT-${year}-`;

    const [row] = await manager.query<{ max: string | null }[]>(
      `SELECT MAX(reference) AS max FROM hotel_bookings WHERE reference LIKE $1`,
      [`${prefix}%`],
    );

    const lastSequence = row?.max ? Number(row.max.slice(prefix.length)) : 0;

    return `${prefix}${String(lastSequence + 1).padStart(4, '0')}`;
  }
}
