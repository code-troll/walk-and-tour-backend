import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, IsNull, Not, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { TourEntity } from '../tours/entities/tour.entity';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { ListHotelsDto } from './dto/list-hotels.dto';
import { SetHotelToursDto } from './dto/set-hotel-tours.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelEntity } from './entities/hotel.entity';
import { resolveTourCurrency } from '../shared/domain/hotel-booking.enums';
import { HotelBookingEntity } from './entities/hotel-booking.entity';
import { HotelUsersService } from './hotel-users.service';
import { HotelStatus } from '../shared/domain';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

export interface HotelTourGrantView {
  tourId: string;
  tourName: string;
  grantedAt: Date;
  grantedBy: string | null;
  /** What this partner is charged, per person. Null means the tour's own price. */
  priceAmount: string | null;
  /** The tour's own price, so a screen can show what the default actually is. */
  tourPriceAmount: string | null;
  /** The tour's currency. A grant never sets one; see HotelTourEntity.priceAmount. */
  currency: string;
}

export interface HotelView {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  cvr: string;
  status: string;
  tours: HotelTourGrantView[];
  audit: {
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface HotelListView {
  items: Array<Omit<HotelView, 'tours'> & { tourCount: number }>;
  page: number;
  limit: number;
  total: number;
}

@Injectable()
export class HotelsService {
  constructor(
    @InjectRepository(HotelEntity)
    private readonly hotelsRepository: Repository<HotelEntity>,
    @InjectRepository(HotelTourEntity)
    private readonly hotelToursRepository: Repository<HotelTourEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(HotelBookingEntity)
    private readonly bookingsRepository: Repository<HotelBookingEntity>,
    private readonly hotelUsersService: HotelUsersService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ListHotelsDto): Promise<HotelListView> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const search = query.search?.trim();

    // Archived hotels are finished, not hidden — they answer by id and by an
    // explicit `status=archived`, but they do not crowd the list somebody scans
    // to find a partner they work with.
    const status = query.status ?? Not('archived' as HotelStatus);

    const where = search
      ? [
          { status, name: ILike(`%${search}%`) },
          { status, cvr: ILike(`%${search}%`) },
        ]
      : { status };

    const [hotels, total] = await this.hotelsRepository.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const grantCounts = await this.countLiveGrants(hotels.map((hotel) => hotel.id));

    return {
      items: hotels.map((hotel) => ({
        ...this.toSummaryView(hotel),
        tourCount: grantCounts.get(hotel.id) ?? 0,
      })),
      page,
      limit,
      total,
    };
  }

  async findOneOrThrow(id: string): Promise<HotelView> {
    const hotel = await this.hotelsRepository.findOne({ where: { id } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${id}" was not found.`);
    }

    return {
      ...this.toSummaryView(hotel),
      tours: await this.findLiveGrants(hotel.id),
    };
  }

  async create(dto: CreateHotelDto, admin: AuthenticatedAdmin): Promise<HotelView> {
    await this.assertCvrAvailable(dto.cvr);

    const hotel = this.hotelsRepository.create({
      name: dto.name.trim(),
      address: dto.address.trim(),
      phone: dto.phone.trim(),
      email: normalizeEmail(dto.email),
      cvr: dto.cvr,
      status: dto.status ?? 'active',
      createdBy: admin.id,
      updatedBy: admin.id,
    });

    const saved = await this.hotelsRepository.save(hotel);

    return this.findOneOrThrow(saved.id);
  }

  async update(
    id: string,
    dto: UpdateHotelDto,
    admin: AuthenticatedAdmin,
  ): Promise<HotelView> {
    const hotel = await this.hotelsRepository.findOne({ where: { id } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${id}" was not found.`);
    }

    if (dto.cvr !== undefined && dto.cvr !== hotel.cvr) {
      await this.assertCvrAvailable(dto.cvr, hotel.id);
      hotel.cvr = dto.cvr;
    }

    if (dto.name !== undefined) {
      hotel.name = dto.name.trim();
    }

    if (dto.address !== undefined) {
      hotel.address = dto.address.trim();
    }

    if (dto.phone !== undefined) {
      hotel.phone = dto.phone.trim();
    }

    if (dto.email !== undefined) {
      hotel.email = normalizeEmail(dto.email);
    }

    if (dto.status !== undefined) {
      hotel.status = dto.status;
    }

    hotel.updatedBy = admin.id;
    await this.hotelsRepository.save(hotel);

    return this.findOneOrThrow(id);
  }

  /**
   * Replaces the set of tours a hotel may sell.
   *
   * Grants that survive the change keep their original row, so the date a hotel
   * was first given a tour is not rewritten by an unrelated edit. Tours that
   * drop out are revoked rather than deleted, and a tour that is granted again
   * later starts a new row instead of resurrecting the old one.
   */
  async setTours(
    id: string,
    dto: SetHotelToursDto,
    admin: AuthenticatedAdmin,
  ): Promise<HotelView> {
    const hotel = await this.hotelsRepository.findOne({ where: { id } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${id}" was not found.`);
    }

    const requested = new Map(
      dto.tours.map((grant) => [grant.tourId, grant.priceAmount ?? null]),
    );
    const requestedTourIds = [...requested.keys()];
    await this.assertToursExist(requestedTourIds);

    await this.dataSource.transaction(async (manager) => {
      const grantsRepository = manager.getRepository(HotelTourEntity);
      const liveGrants = await grantsRepository.find({
        where: { hotelId: id, revokedAt: IsNull() },
      });

      const liveTourIds = new Set(liveGrants.map((grant) => grant.tourId));

      const revoked = liveGrants.filter((grant) => !requested.has(grant.tourId));

      if (revoked.length > 0) {
        await grantsRepository.update(
          { id: In(revoked.map((grant) => grant.id)) },
          { revokedAt: new Date(), revokedBy: admin.id },
        );
      }

      const added = requestedTourIds.filter((tourId) => !liveTourIds.has(tourId));

      // A grant that survives the call is repriced in place rather than revoked
      // and re-granted: `granted_at` is history, and re-granting would rewrite it
      // every time an administrator adjusted a number.
      const kept = liveGrants.filter((grant) => requested.has(grant.tourId));

      for (const grant of kept) {
        const price = requested.get(grant.tourId) ?? null;

        if (price !== grant.priceAmount) {
          await grantsRepository.update({ id: grant.id }, { priceAmount: price });
        }
      }

      if (added.length > 0) {
        await grantsRepository.insert(
          added.map((tourId) => ({
            hotelId: id,
            tourId,
            grantedBy: admin.id,
            priceAmount: requested.get(tourId) ?? null,
          })),
        );
      }

      if (revoked.length > 0 || added.length > 0) {
        await manager
          .getRepository(HotelEntity)
          .update({ id }, { updatedBy: admin.id });
      }
    });

    return this.findOneOrThrow(id);
  }

  /**
   * Finish with a hotel without losing what it did.
   *
   * Archiving releases the access user and the CVR, and revokes the live tour
   * grants. The bookings stay exactly where they are: they are the record of
   * work done and money owed, and a hotel that stops being a partner does not
   * stop having been one.
   *
   * This is the difference from `disabled`, which releases nothing because a
   * disabled hotel is coming back.
   */
  async archive(id: string, admin: AuthenticatedAdmin): Promise<HotelView> {
    const hotel = await this.hotelsRepository.findOne({ where: { id } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${id}" was not found.`);
    }

    if (hotel.status === 'archived') {
      return this.findOneOrThrow(id);
    }

    // Before the status changes, so a failure here leaves an active hotel with
    // its user rather than an archived one that can still sign in.
    await this.hotelUsersService.release(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(HotelTourEntity).update(
        { hotelId: id, revokedAt: IsNull() },
        { revokedAt: new Date(), revokedBy: admin.id },
      );

      await manager.getRepository(HotelEntity).update(
        { id },
        { status: 'archived', updatedBy: admin.id },
      );
    });

    return this.findOneOrThrow(id);
  }

  /**
   * Remove a hotel that never did anything.
   *
   * Only when it holds no bookings at all. `hotel_bookings.hotel_id` is
   * `ON DELETE RESTRICT`, so the database would refuse anyway — this checks
   * first so the answer is a sentence about archiving instead of a foreign key
   * violation.
   *
   * The identity is deleted before the row, because `hotel_users` cascades from
   * `hotels`: letting the cascade run first would drop the only record of which
   * identity to delete.
   *
   * There is no `admin` argument on purpose: the row is gone, so there is
   * nowhere to record who did it. Deleting is for hotels that never traded;
   * anything with history is archived, and that keeps its audit trail.
   */
  async remove(id: string): Promise<void> {
    const hotel = await this.hotelsRepository.findOne({ where: { id } });

    if (!hotel) {
      throw new NotFoundException(`Hotel "${id}" was not found.`);
    }

    const bookings = await this.bookingsRepository.count({
      where: { hotelId: id },
    });

    if (bookings > 0) {
      throw new ConflictException(
        `Hotel "${hotel.name}" has ${bookings} booking(s) and cannot be deleted. ` +
          'Archive it instead: that releases the access user and the CVR and ' +
          'keeps the bookings.',
      );
    }

    await this.hotelUsersService.release(id);
    await this.hotelsRepository.delete({ id });
  }

  private async findLiveGrants(hotelId: string): Promise<HotelTourGrantView[]> {
    const grants = await this.hotelToursRepository.find({
      where: { hotelId, revokedAt: IsNull() },
      relations: { tour: true },
      order: { grantedAt: 'ASC' },
    });

    return grants.map((grant) => ({
      tourId: grant.tourId,
      tourName: grant.tour?.name ?? '',
      grantedAt: grant.grantedAt,
      grantedBy: grant.grantedBy,
      priceAmount: grant.priceAmount ?? null,
      tourPriceAmount: grant.tour?.priceAmount ?? null,
      currency: resolveTourCurrency(grant.tour?.priceCurrency ?? null),
    }));
  }

  private async countLiveGrants(hotelIds: string[]): Promise<Map<string, number>> {
    if (hotelIds.length === 0) {
      return new Map();
    }

    const rows = await this.hotelToursRepository
      .createQueryBuilder('grant')
      .select('grant.hotel_id', 'hotelId')
      .addSelect('COUNT(*)', 'count')
      .where('grant.hotel_id IN (:...hotelIds)', { hotelIds })
      .andWhere('grant.revoked_at IS NULL')
      .groupBy('grant.hotel_id')
      .getRawMany<{ hotelId: string; count: string }>();

    return new Map(rows.map((row) => [row.hotelId, Number(row.count)]));
  }

  private async assertCvrAvailable(cvr: string, exceptHotelId?: string): Promise<void> {
    // Archived hotels are excluded here for the same reason the unique index
    // excludes them. If this check disagreed with the index, re-registering a
    // company would be refused by a sentence the database would have allowed.
    const existing = await this.hotelsRepository.findOne({
      where: {
        cvr,
        status: Not('archived' as HotelStatus),
        ...(exceptHotelId ? { id: Not(exceptHotelId) } : {}),
      },
    });

    if (existing) {
      throw new ConflictException(
        `A hotel with CVR number "${cvr}" is already registered.`,
      );
    }
  }

  private async assertToursExist(tourIds: string[]): Promise<void> {
    if (tourIds.length === 0) {
      return;
    }

    const found = await this.toursRepository.find({
      where: { id: In(tourIds) },
      select: { id: true },
    });

    const foundIds = new Set(found.map((tour) => tour.id));
    const missing = tourIds.filter((tourId) => !foundIds.has(tourId));

    if (missing.length > 0) {
      throw new NotFoundException(
        `The following tours were not found: ${missing.join(', ')}.`,
      );
    }
  }

  private toSummaryView(hotel: HotelEntity): Omit<HotelView, 'tours'> {
    return {
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      phone: hotel.phone,
      email: hotel.email,
      cvr: hotel.cvr,
      status: hotel.status,
      audit: {
        createdBy: hotel.createdBy,
        updatedBy: hotel.updatedBy,
        createdAt: hotel.createdAt,
        updatedAt: hotel.updatedAt,
      },
    };
  }
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
