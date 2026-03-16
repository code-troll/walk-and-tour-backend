import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { TOUR_TYPES } from '../shared/domain';
import { TagEntity } from '../tags/tag.entity';
import { CreateTourDto } from './dto/create-tour.dto';
import { AdminListToursDto } from './dto/list-tours.dto';
import {
  AttachTourMediaDto,
  SetTourCoverMediaDto,
  UpdateTourMediaDto,
} from './dto/tour-media.dto';
import {
  CreateTourTranslationDto,
  PublishTourTranslationDto,
  UpdateTourTranslationDto,
} from './dto/tour-translation.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourMediaEntity } from './entities/tour-media.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';

const LOCALE_CODE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const REQUIRED_LOCALIZED_LIST_FIELDS = [
  'highlights',
  'included',
  'notIncluded',
] as const;
const TOUR_SORT_ORDER_CONSTRAINT = 'UQ_tours_sort_order';

interface TourMediaAttachmentInput {
  mediaId: string;
  orderIndex: number;
  altText: Record<string, string> | null;
  media: MediaAssetEntity;
}

interface TourSharedInput {
  name: string;
  slug: string;
  contentSchema: Record<string, unknown> | null;
  price: { amount: number; currency: string } | null;
  rating: number | null;
  reviewCount: number | null;
  tourType: string;
  durationMinutes: number | null;
  startPoint: Record<string, unknown> | null;
  endPoint: Record<string, unknown> | null;
  itinerary: {
    variant: 'description' | 'stops';
    stops?: Array<{
      id: string;
      durationMinutes?: number;
      coordinates?: Record<string, number>;
      nextConnection?: Record<string, unknown>;
    }>;
  } | null;
  tagKeys: string[];
}

interface JsonCoordinates {
  lat: number;
  lng: number;
}

interface JsonPoint {
  coordinates?: JsonCoordinates;
}

interface TourListFilters {
  tagKeys?: string[];
  tourTypes?: string[];
}

@Injectable()
export class ToursService {
  constructor(
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(TourItineraryStopEntity)
    private readonly stopsRepository: Repository<TourItineraryStopEntity>,
    @InjectRepository(TourTranslationEntity)
    private readonly translationsRepository: Repository<TourTranslationEntity>,
    @InjectRepository(TourMediaEntity)
    private readonly tourMediaRepository: Repository<TourMediaEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @InjectRepository(TagEntity)
    private readonly tagsRepository: Repository<TagEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    private readonly schemaPolicyService: TourSchemaPolicyService,
    private readonly payloadValidationService: TourPayloadValidationService,
  ) {}

  async findAll(filters: AdminListToursDto = {}): Promise<unknown[]> {
    const tours = await this.buildListQuery(filters).getMany();

    return tours.map((tour) => this.toAdminResponse(tour));
  }

  async findOne(id: string): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);

    return this.toAdminResponse(tour);
  }

  async create(
    dto: CreateTourDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Tour name is required.');
    }

    if (!TOUR_TYPES.includes(dto.tourType as (typeof TOUR_TYPES)[number])) {
      throw new BadRequestException(`Tour type "${dto.tourType}" is invalid.`);
    }

    const existing = await this.toursRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Tour slug "${dto.slug}" already exists.`);
    }

    const tour = this.toursRepository.create({
      name: dto.name.trim(),
      slug: dto.slug,
      sortOrder: dto.sortOrder ?? 0,
      coverMediaId: null,
      contentSchema: null,
      priceAmount: null,
      priceCurrency: null,
      rating: null,
      reviewCount: null,
      tourType: dto.tourType,
      durationMinutes: null,
      startPoint: null,
      endPoint: null,
      itineraryVariant: null,
      tags: [],
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    const savedTour = await this.createTourWithManualOrder(tour, dto.sortOrder);

    return this.findOne(savedTour.id);
  }

  async update(
    id: string,
    dto: UpdateTourDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);

    if (dto.slug && dto.slug !== existing.slug) {
      const slugCollision = await this.toursRepository.findOne({
        where: { slug: dto.slug },
      });

      if (slugCollision) {
        throw new ConflictException(`Tour slug "${dto.slug}" already exists.`);
      }
    }

    const aggregate = await this.buildSharedAggregate(dto, existing);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);

    existing.name = aggregate.name;
    existing.slug = aggregate.slug;
    existing.contentSchema = aggregate.contentSchema;
    existing.priceAmount = aggregate.price ? aggregate.price.amount.toFixed(2) : null;
    existing.priceCurrency = aggregate.price?.currency ?? null;
    existing.rating = aggregate.rating !== null ? aggregate.rating.toFixed(2) : null;
    existing.reviewCount = aggregate.reviewCount;
    existing.tourType = aggregate.tourType;
    existing.durationMinutes = aggregate.durationMinutes;
    existing.startPoint = aggregate.startPoint;
    existing.endPoint = aggregate.endPoint;
    existing.itineraryVariant = aggregate.itinerary?.variant ?? null;
    existing.tags = tags;
    existing.updatedBy = actor.id;
    existing.sortOrder = dto.sortOrder ?? existing.sortOrder;

    if (dto.sortOrder !== undefined) {
      await this.moveTourToSortOrder(existing, dto.sortOrder);
    } else {
      await this.toursRepository.save(existing);
    }

    await this.replaceStops(existing.id, aggregate);

    const refreshed = await this.findEntityOrThrow(existing.id);
    await this.recalculateAndPersistTranslations(refreshed);

    return this.findOne(existing.id);
  }

  async createTranslation(
    id: string,
    dto: CreateTourTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(dto.languageCode);

    const existing = tour.translations.find(
      (translation) => translation.languageCode === dto.languageCode,
    );

    if (existing) {
      throw new ConflictException(
        `Tour translation "${dto.languageCode}" already exists for tour "${id}".`,
      );
    }

    this.validateDraftPayloadAgainstSchema(tour, dto.payload);

    const translation = this.translationsRepository.create({
      tourId: id,
      languageCode: dto.languageCode,
      bookingReferenceId: dto.bookingReferenceId ?? null,
      payload: dto.payload,
      isReady: this.calculateTranslationReadiness(tour, dto.payload),
      isPublished: false,
    });

    await this.translationsRepository.save(translation);
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async updateTranslation(
    id: string,
    languageCode: string,
    dto: UpdateTourTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(tour, languageCode);

    const nextPayload = dto.payload ?? translation.payload;
    this.validateDraftPayloadAgainstSchema(tour, nextPayload);

    translation.payload = nextPayload;

    if ('bookingReferenceId' in dto) {
      translation.bookingReferenceId = dto.bookingReferenceId ?? null;
    }

    translation.isReady = this.calculateTranslationReadiness(tour, translation.payload);
    if (!translation.isReady) {
      translation.isPublished = false;
    }

    await this.translationsRepository.save(translation);
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async publishTranslation(
    id: string,
    languageCode: string,
    dto: PublishTourTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(tour, languageCode);

    if ('bookingReferenceId' in dto) {
      translation.bookingReferenceId = dto.bookingReferenceId ?? null;
    }

    translation.isReady = this.calculateTranslationReadiness(tour, translation.payload);

    if (!translation.isReady) {
      translation.isPublished = false;
      await this.translationsRepository.save(translation);
      throw new BadRequestException(
        `Translation "${translation.languageCode}" cannot be published until it is ready.`,
      );
    }

    translation.isPublished = true;

    await this.translationsRepository.save(translation);
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async unpublishTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(languageCode);
    const translation = this.findTranslationOrThrow(tour, languageCode);

    translation.isReady = this.calculateTranslationReadiness(tour, translation.payload);
    translation.isPublished = false;

    await this.translationsRepository.save(translation);
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async deleteTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const tour = await this.findEntityOrThrow(id);
    const translation = this.findTranslationOrThrow(tour, languageCode);

    await this.translationsRepository.delete({ id: translation.id });
    await this.touchTour(tour, actor);
  }

  async listMedia(id: string): Promise<{ items: unknown[] }> {
    const tour = await this.findEntityOrThrow(id);
    return {
      items: [...(tour.mediaItems ?? [])]
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((item) => this.toAdminMediaItemResponse(tour, item)),
    };
  }

  async attachMedia(
    id: string,
    dto: AttachTourMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    this.validateLocalizedAltText(dto.altText ?? null, 'Tour media altText');

    const existingAttachment = tour.mediaItems.find((item) => item.mediaId === dto.mediaId);
    if (existingAttachment) {
      throw new ConflictException(
        `Media asset "${dto.mediaId}" is already attached to tour "${id}".`,
      );
    }

    const mediaAsset = await this.getMediaAssetOrThrow(dto.mediaId);
    const orderIndex =
      dto.orderIndex ?? this.getNextMediaOrderIndex(tour.mediaItems ?? []);
    await this.assertOrderIndexAvailable(id, orderIndex, dto.mediaId);

    await this.tourMediaRepository.save(
      this.tourMediaRepository.create({
        tourId: id,
        mediaId: mediaAsset.id,
        orderIndex,
        altText: dto.altText ?? null,
      }),
    );
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async updateMedia(
    id: string,
    mediaId: string,
    dto: UpdateTourMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    const attachment = this.findTourMediaOrThrow(tour, mediaId);

    if ('altText' in dto) {
      this.validateLocalizedAltText(dto.altText ?? null, 'Tour media altText');
      attachment.altText = dto.altText ?? null;
    }

    if (dto.orderIndex !== undefined && dto.orderIndex !== attachment.orderIndex) {
      await this.assertOrderIndexAvailable(id, dto.orderIndex, mediaId);
      attachment.orderIndex = dto.orderIndex;
    }

    await this.tourMediaRepository.save(attachment);
    await this.touchTour(tour, actor);

    return this.findOne(id);
  }

  async detachMedia(
    id: string,
    mediaId: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const tour = await this.findEntityOrThrow(id);
    this.findTourMediaOrThrow(tour, mediaId);

    await this.tourMediaRepository.delete({ tourId: id, mediaId });

    if (tour.coverMediaId === mediaId) {
      await this.toursRepository.update({ id }, { coverMediaId: null, updatedBy: actor.id });
    }

    await this.touchTour(tour, actor);
  }

  async setCoverMedia(
    id: string,
    dto: SetTourCoverMediaDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const tour = await this.findEntityOrThrow(id);
    const attachment = this.findTourMediaOrThrow(tour, dto.mediaId);

    if (attachment.media.mediaType !== 'image') {
      throw new BadRequestException('Tour cover media must reference an image asset.');
    }

    await this.toursRepository.update(
      { id },
      {
        coverMediaId: dto.mediaId,
        updatedBy: actor.id,
      },
    );

    return this.findOne(id);
  }

  async clearCoverMedia(id: string, actor: AuthenticatedAdmin): Promise<unknown> {
    await this.findEntityOrThrow(id);
    await this.toursRepository.update(
      { id },
      {
        coverMediaId: null,
        updatedBy: actor.id,
      },
    );

    return this.findOne(id);
  }

  private async buildSharedAggregate(
    source: UpdateTourDto,
    existing?: TourEntity,
  ): Promise<TourSharedInput> {
    const contentSchema =
      source.contentSchema !== undefined
        ? this.schemaPolicyService.validateOrThrow(source.contentSchema)
        : (existing?.contentSchema ?? null);

    const itinerary = source.itinerary
      ? {
          variant: source.itinerary.variant,
          stops: source.itinerary.stops?.map((stop) => ({
            id: stop.id,
            durationMinutes: stop.durationMinutes,
            coordinates: stop.coordinates
              ? {
                  lat: stop.coordinates.lat,
                  lng: stop.coordinates.lng,
                }
              : undefined,
            nextConnection: stop.nextConnection
              ? {
                  durationMinutes: stop.nextConnection.durationMinutes,
                  commuteMode: stop.nextConnection.commuteMode,
                }
              : undefined,
          })),
        }
      : this.getExistingItinerary(existing);

    const aggregate: TourSharedInput = {
      name: source.name ?? existing?.name ?? '',
      slug: source.slug ?? existing?.slug ?? '',
      contentSchema,
      price:
        source.price === null
          ? null
          : source.price
            ? source.price
            : this.getExistingPrice(existing),
      rating:
        source.rating !== undefined
          ? source.rating
          : (existing?.rating !== null && existing?.rating !== undefined
              ? Number(existing.rating)
              : null),
      reviewCount: source.reviewCount ?? existing?.reviewCount ?? null,
      tourType: source.tourType ?? existing?.tourType ?? TOUR_TYPES[0],
      durationMinutes: source.durationMinutes ?? existing?.durationMinutes ?? null,
      startPoint:
        'startPoint' in source
          ? (source.startPoint ? this.toJsonPoint(source.startPoint) : null)
          : (existing?.startPoint ?? null),
      endPoint:
        'endPoint' in source
          ? (source.endPoint ? this.toJsonPoint(source.endPoint) : null)
          : (existing?.endPoint ?? null),
      itinerary,
      tagKeys: source.tagKeys ?? existing?.tags.map((tag) => tag.key) ?? [],
    };

    this.validateSharedRules(aggregate);

    return aggregate;
  }

  private validateSharedRules(aggregate: TourSharedInput): void {
    if (!aggregate.slug) {
      throw new BadRequestException('Tour slug is required.');
    }

    if (!aggregate.name || aggregate.name.trim().length === 0) {
      throw new BadRequestException('Tour name is required.');
    }

    if (!TOUR_TYPES.includes(aggregate.tourType as (typeof TOUR_TYPES)[number])) {
      throw new BadRequestException(`Tour type "${aggregate.tourType}" is invalid.`);
    }

    if (aggregate.contentSchema) {
      this.validateContentSchemaForLocalizedCancellationType(aggregate.contentSchema);
    }

    if (aggregate.tourType === 'tip_based' && aggregate.price) {
      throw new BadRequestException('Tip-based tours cannot define a fixed price.');
    }

    if (!aggregate.itinerary) {
      return;
    }

    if (aggregate.itinerary.variant === 'stops') {
      if (!aggregate.itinerary.stops || aggregate.itinerary.stops.length === 0) {
        throw new BadRequestException('Stop-based itineraries must include at least one stop.');
      }

      const stopIds = new Set<string>();
      const stops = aggregate.itinerary.stops;

      stops.forEach((stop, index) => {
        if (stopIds.has(stop.id)) {
          throw new BadRequestException(`Duplicate itinerary stop "${stop.id}".`);
        }

        stopIds.add(stop.id);

        if (index === stops.length - 1 && stop.nextConnection) {
          throw new BadRequestException(
            `The final itinerary stop "${stop.id}" cannot define nextConnection.`,
          );
        }
      });
    }

    if (aggregate.itinerary.variant === 'description' && aggregate.itinerary.stops?.length) {
      throw new BadRequestException('Descriptive itineraries cannot include shared stops.');
    }
  }

  private async assertLanguageExists(languageCode: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: { code: languageCode },
    });

    if (!language) {
      throw new BadRequestException(
        `Translations reference unknown language codes: ${languageCode}`,
      );
    }
  }

  private validateDraftPayloadAgainstSchema(
    tour: TourEntity,
    payload: Record<string, unknown>,
  ): void {
    if (!tour.contentSchema) {
      return;
    }

    const draftSchema = this.schemaPolicyService.createDraftSchema(tour.contentSchema) as Record<
      string,
      unknown
    >;

    this.validateContentSchemaForLocalizedCancellationType(tour.contentSchema);
    this.payloadValidationService.validateOrThrow(draftSchema, payload);
  }

  private calculateTranslationReadiness(
    tour: TourEntity,
    payload: Record<string, unknown>,
  ): boolean {
    if (!tour.contentSchema) {
      return false;
    }

    try {
      this.payloadValidationService.validateOrThrow(tour.contentSchema, payload);
    } catch {
      return false;
    }

    if (this.getMissingRequiredLocalizedLists(payload).length > 0) {
      return false;
    }

    if (tour.itineraryVariant === 'stops') {
      const missingStops = this.getMissingLocalizedStops(tour, payload);

      if (missingStops.length > 0) {
        return false;
      }
    }

    return true;
  }

  private getMissingLocalizedStops(
    tour: Pick<TourEntity, 'itineraryVariant' | 'stops'>,
    payload: Record<string, unknown>,
  ): string[] {
    const sharedStopIds = new Set(tour.stops.map((stop) => stop.stopId));
    const itineraryStops = payload.itineraryStops;

    if (
      typeof itineraryStops !== 'object' ||
      itineraryStops === null ||
      Array.isArray(itineraryStops)
    ) {
      return [...sharedStopIds];
    }

    const localizedStops = itineraryStops as Record<string, unknown>;

    return [...sharedStopIds].filter((stopId) => {
      const entry = localizedStops[stopId];

      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        return true;
      }

      const stop = entry as Record<string, unknown>;

      return typeof stop.title !== 'string' || typeof stop.description !== 'string';
    });
  }

  private getMissingRequiredLocalizedLists(payload: Record<string, unknown>): string[] {
    return REQUIRED_LOCALIZED_LIST_FIELDS.filter((field) => {
      const value = payload[field];

      return !Array.isArray(value) || value.some((entry) => typeof entry !== 'string');
    });
  }

  private validateContentSchemaForLocalizedCancellationType(
    schema: Record<string, unknown>,
  ): void {
    const properties = schema.properties;
    const required = schema.required;

    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
      throw new BadRequestException(
        'Tour contentSchema must define object properties, including localized cancellationType.',
      );
    }

    const cancellationType = (properties as Record<string, unknown>).cancellationType;

    if (
      typeof cancellationType !== 'object' ||
      cancellationType === null ||
      Array.isArray(cancellationType) ||
      (cancellationType as Record<string, unknown>).type !== 'string'
    ) {
      throw new BadRequestException(
        'Tour contentSchema must declare a localized string property named cancellationType.',
      );
    }

    if (!Array.isArray(required) || !required.includes('cancellationType')) {
      throw new BadRequestException(
        'Tour contentSchema must require the localized cancellationType field.',
      );
    }
  }

  private async getTagsOrThrow(keys: string[]): Promise<TagEntity[]> {
    if (keys.length === 0) {
      return [];
    }

    const tags = await this.tagsRepository.findBy({
      key: In(keys),
    });

    if (tags.length !== keys.length) {
      const found = new Set(tags.map((tag) => tag.key));
      const missing = keys.filter((key) => !found.has(key));
      throw new BadRequestException(`Unknown tag keys: ${missing.join(', ')}`);
    }

    return keys.map((key) => tags.find((tag) => tag.key === key) as TagEntity);
  }

  private async createTourWithManualOrder(
    tour: TourEntity,
    requestedSortOrder: number | undefined,
  ): Promise<TourEntity> {
    return this.toursRepository.manager.transaction(async (manager) => {
      await this.deferTourSortOrderConstraint(manager);
      const orderedTours = await this.getToursInSortOrder(manager);
      const targetSortOrder = this.normalizeInsertSortOrder(
        requestedSortOrder,
        orderedTours.length,
      );

      orderedTours.splice(targetSortOrder, 0, tour);

      return this.persistOrderedTours(manager, orderedTours, tour);
    });
  }

  private async moveTourToSortOrder(
    tour: TourEntity,
    requestedSortOrder: number,
  ): Promise<TourEntity> {
    return this.toursRepository.manager.transaction(async (manager) => {
      await this.deferTourSortOrderConstraint(manager);
      const orderedTours = await this.getToursInSortOrder(manager);
      const toursWithoutCurrent = orderedTours.filter(
        (existingTour) => existingTour.id !== tour.id,
      );
      const targetSortOrder = this.normalizeExistingTourSortOrder(
        requestedSortOrder,
        toursWithoutCurrent.length,
      );

      toursWithoutCurrent.splice(targetSortOrder, 0, tour);

      return this.persistOrderedTours(manager, toursWithoutCurrent, tour);
    });
  }

  private async deferTourSortOrderConstraint(manager: EntityManager): Promise<void> {
    await manager.query(`SET CONSTRAINTS "${TOUR_SORT_ORDER_CONSTRAINT}" DEFERRED`);
  }

  private async getToursInSortOrder(manager: EntityManager): Promise<TourEntity[]> {
    return manager.find(TourEntity, {
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
        id: 'ASC',
      },
    });
  }

  private normalizeInsertSortOrder(
    requestedSortOrder: number | undefined,
    totalTours: number,
  ): number {
    if (requestedSortOrder === undefined) {
      return totalTours;
    }

    return Math.min(requestedSortOrder, totalTours);
  }

  private normalizeExistingTourSortOrder(
    requestedSortOrder: number,
    totalRemainingTours: number,
  ): number {
    return Math.min(requestedSortOrder, totalRemainingTours);
  }

  private async persistOrderedTours(
    manager: EntityManager,
    tours: TourEntity[],
    focusTour: TourEntity,
  ): Promise<TourEntity> {
    const previousSortOrders = new Map(
      tours
        .filter((tour) => typeof tour.id === 'string')
        .map((tour) => [tour.id, tour.sortOrder] as const),
    );

    tours.forEach((tour, index) => {
      tour.sortOrder = index;
    });

    const changedTours = tours.filter(
      (tour) =>
        !tour.id ||
        previousSortOrders.get(tour.id) !== tour.sortOrder ||
        tour.id === focusTour.id,
    );

    const savedTours = await manager.save(TourEntity, changedTours);

    return (
      savedTours.find(
        (savedTour) =>
          savedTour.id === focusTour.id ||
          (focusTour.id === undefined && savedTour.slug === focusTour.slug),
      ) ?? focusTour
    );
  }

  private async replaceStops(id: string, aggregate: TourSharedInput): Promise<void> {
    await this.stopsRepository.delete({ tourId: id });

    if (!aggregate.itinerary || aggregate.itinerary.variant !== 'stops' || !aggregate.itinerary.stops) {
      return;
    }

    const stops = aggregate.itinerary.stops.map((stop, index) =>
      this.stopsRepository.create({
        tourId: id,
        stopId: stop.id,
        orderIndex: index,
        durationMinutes: stop.durationMinutes ?? null,
        coordinates: stop.coordinates ?? null,
        nextConnection: stop.nextConnection ?? null,
      }),
    );

    await this.stopsRepository.save(stops);
  }

  private async recalculateAndPersistTranslations(tour: TourEntity): Promise<void> {
    if (tour.translations.length === 0) {
      return;
    }

    const updatedTranslations = tour.translations
      .map((translation) => {
        const isReady = this.calculateTranslationReadiness(tour, translation.payload);
        const isPublished = isReady ? translation.isPublished : false;

        if (translation.isReady === isReady && translation.isPublished === isPublished) {
          return null;
        }

        translation.isReady = isReady;
        translation.isPublished = isPublished;

        return translation;
      })
      .filter((translation): translation is TourTranslationEntity => translation !== null);

    if (updatedTranslations.length === 0) {
      return;
    }

    await this.translationsRepository.save(updatedTranslations);
  }

  private getExistingItinerary(existing: TourEntity | undefined): TourSharedInput['itinerary'] {
    if (!existing || !existing.itineraryVariant) {
      return null;
    }

    if (existing.itineraryVariant === 'stops') {
      return {
        variant: 'stops',
        stops: [...existing.stops]
          .sort((left, right) => left.orderIndex - right.orderIndex)
          .map((stop) => ({
            id: stop.stopId,
            durationMinutes: stop.durationMinutes ?? undefined,
            coordinates: stop.coordinates ?? undefined,
            nextConnection: stop.nextConnection ?? undefined,
          })),
      };
    }

    return {
      variant: 'description',
    };
  }

  private getExistingPrice(
    existing: TourEntity | undefined,
  ): { amount: number; currency: string } | null {
    if (!existing?.priceAmount || !existing.priceCurrency) {
      return null;
    }

    return {
      amount: Number(existing.priceAmount),
      currency: existing.priceCurrency,
    };
  }

  private getNextMediaOrderIndex(items: TourMediaEntity[]): number {
    if (items.length === 0) {
      return 0;
    }

    return Math.max(...items.map((item) => item.orderIndex)) + 1;
  }

  private async assertOrderIndexAvailable(
    tourId: string,
    orderIndex: number,
    excludedMediaId?: string,
  ): Promise<void> {
    const existing = await this.tourMediaRepository.findOne({
      where: { tourId, orderIndex },
    });

    if (existing && existing.mediaId !== excludedMediaId) {
      throw new ConflictException(
        `Tour media orderIndex "${orderIndex}" is already in use for tour "${tourId}".`,
      );
    }
  }

  private async getMediaAssetOrThrow(id: string): Promise<MediaAssetEntity> {
    const mediaAsset = await this.mediaAssetsRepository.findOne({
      where: { id },
    });

    if (!mediaAsset) {
      throw new BadRequestException(`Unknown media asset ID: ${id}`);
    }

    return mediaAsset;
  }

  private async findEntityOrThrow(id: string): Promise<TourEntity> {
    const tour = await this.toursRepository.findOne({
      where: { id },
      relations: {
        coverMedia: true,
        mediaItems: {
          media: true,
        },
        tags: true,
        stops: true,
        translations: true,
      },
    });

    if (!tour) {
      throw new NotFoundException(`Tour "${id}" was not found.`);
    }

    return tour;
  }

  private findTourMediaOrThrow(tour: TourEntity, mediaId: string): TourMediaEntity {
    const attachment = (tour.mediaItems ?? []).find((item) => item.mediaId === mediaId);

    if (!attachment) {
      throw new NotFoundException(
        `Tour media "${mediaId}" was not found for tour "${tour.id}".`,
      );
    }

    return attachment;
  }

  private findTranslationOrThrow(
    tour: TourEntity,
    languageCode: string,
  ): TourTranslationEntity {
    const translation = tour.translations.find(
      (entry) => entry.languageCode === languageCode,
    );

    if (!translation) {
      throw new NotFoundException(
        `Tour translation "${languageCode}" was not found for tour "${tour.id}".`,
      );
    }

    return translation;
  }

  private async touchTour(
    tour: TourEntity,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    tour.updatedBy = actor.id;
    await this.toursRepository.update(
      { id: tour.id },
      { updatedBy: actor.id },
    );
  }

  private toAdminResponse(tour: TourEntity): unknown {
    const orderedStops = [...tour.stops].sort((left, right) => left.orderIndex - right.orderIndex);
    const orderedMedia = [...(tour.mediaItems ?? [])].sort(
      (left, right) => left.orderIndex - right.orderIndex,
    );

    const translations = Object.fromEntries(
      tour.translations.map((translation) => [
        translation.languageCode,
        {
          isReady: translation.isReady,
          isPublished: translation.isPublished,
          bookingReferenceId: translation.bookingReferenceId,
          cancellationType: this.getStringField(translation.payload, 'cancellationType'),
          highlights: this.getStringListField(translation.payload, 'highlights'),
          included: this.getStringListField(translation.payload, 'included'),
          notIncluded: this.getStringListField(translation.payload, 'notIncluded'),
          payload: translation.payload,
        },
      ]),
    );

    const translationAvailability = tour.translations.map((translation) => {
      const missingRequiredLists = this.getMissingRequiredLocalizedLists(translation.payload);
      const missingStopTranslations =
        tour.itineraryVariant === 'stops'
          ? this.getMissingLocalizedStops(tour, translation.payload)
          : [];

      const isSchemaValid = this.isTranslationPayloadValid(tour, translation);

      return {
        languageCode: translation.languageCode,
        isReady: translation.isReady,
        isPublished: translation.isPublished,
        missingRequiredLists,
        missingStopTranslations,
        isSchemaValid,
        publiclyAvailable:
          this.isSharedTourPubliclyValid(tour) &&
          translation.isReady &&
          translation.isPublished &&
          missingRequiredLists.length === 0 &&
          isSchemaValid &&
          missingStopTranslations.length === 0,
      };
    });

    return {
      id: tour.id,
      name: tour.name,
      sortOrder: tour.sortOrder,
      slug: tour.slug,
      coverMediaId: tour.coverMediaId,
      mediaItems: orderedMedia.map((item) => this.toAdminMediaItemResponse(tour, item)),
      contentSchema: tour.contentSchema,
      price:
        tour.priceAmount && tour.priceCurrency
          ? {
              amount: Number(tour.priceAmount),
              currency: tour.priceCurrency,
            }
          : null,
      rating: tour.rating !== null ? Number(tour.rating) : null,
      reviewCount: tour.reviewCount,
      tourType: tour.tourType,
      durationMinutes: tour.durationMinutes,
      startPoint: tour.startPoint,
      endPoint: tour.endPoint,
      itinerary:
        tour.itineraryVariant !== null
          ? {
              variant: tour.itineraryVariant,
              stops:
                tour.itineraryVariant === 'stops'
                  ? orderedStops.map((stop) => ({
                      id: stop.stopId,
                      durationMinutes: stop.durationMinutes,
                      coordinates: stop.coordinates,
                      nextConnection: stop.nextConnection,
                    }))
                  : [],
            }
          : null,
      tagKeys: tour.tags.map((tag) => tag.key),
      tags: tour.tags.map((tag) => ({
        key: tag.key,
        labels: tag.labels,
      })),
      translations,
      translationAvailability,
      audit: {
        createdBy: tour.createdBy,
        updatedBy: tour.updatedBy,
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
      },
    };
  }

  private buildListQuery(
    filters: TourListFilters,
  ): SelectQueryBuilder<TourEntity> {
    const query = this.toursRepository
      .createQueryBuilder('tour')
      .leftJoinAndSelect('tour.coverMedia', 'coverMedia')
      .leftJoinAndSelect('tour.mediaItems', 'mediaItems')
      .leftJoinAndSelect('mediaItems.media', 'media')
      .leftJoinAndSelect('tour.tags', 'tags')
      .leftJoinAndSelect('tour.stops', 'stops')
      .leftJoinAndSelect('tour.translations', 'translations')
      .distinct(true)
      .orderBy('tour.sortOrder', 'ASC');

    if (filters.tourTypes?.length) {
      query.andWhere('tour.tourType IN (:...tourTypes)', {
        tourTypes: filters.tourTypes,
      });
    }

    if (filters.tagKeys?.length) {
      const subquery = query
        .subQuery()
        .select('1')
        .from('tour_tags', 'tour_tags_filter')
        .where('tour_tags_filter.tour_id = tour.id')
        .andWhere('tour_tags_filter.tag_key IN (:...tagKeys)')
        .getQuery();

      query.andWhere(`EXISTS ${subquery}`, {
        tagKeys: filters.tagKeys,
      });
    }

    return query;
  }

  private isTranslationPayloadValid(
    tour: TourEntity,
    translation: TourTranslationEntity,
  ): boolean {
    try {
      if (!tour.contentSchema) {
        return false;
      }

      const schema =
        translation.isReady
          ? tour.contentSchema
          : (this.schemaPolicyService.createDraftSchema(tour.contentSchema) as Record<
              string,
              unknown
            >);

      this.payloadValidationService.validateOrThrow(schema, translation.payload);

      if (translation.isReady && this.getMissingRequiredLocalizedLists(translation.payload).length > 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private isSharedTourPubliclyValid(tour: TourEntity): boolean {
    if (!tour.contentSchema) {
      return false;
    }

    if (tour.rating === null || tour.reviewCount === null || tour.durationMinutes === null) {
      return false;
    }

    if (!tour.startPoint || !tour.endPoint || !tour.itineraryVariant) {
      return false;
    }

    if (tour.tourType !== 'tip_based' && (!tour.priceAmount || !tour.priceCurrency)) {
      return false;
    }

    if (tour.tourType === 'tip_based' && (tour.priceAmount || tour.priceCurrency)) {
      return false;
    }

    if (tour.itineraryVariant === 'stops' && tour.stops.length === 0) {
      return false;
    }

    return true;
  }

  private getStringListField(
    payload: Record<string, unknown>,
    key: (typeof REQUIRED_LOCALIZED_LIST_FIELDS)[number],
  ): string[] | null {
    const value = payload[key];

    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      return null;
    }

    return [...value];
  }

  private getStringField(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];

    return typeof value === 'string' ? value : null;
  }

  private toJsonPoint(point: JsonPoint): Record<string, unknown> {
    if (!point.coordinates) {
      return {};
    }

    return {
      coordinates: {
        lat: point.coordinates.lat,
        lng: point.coordinates.lng,
      },
    };
  }

  private validateLocalizedAltText(
    altText: Record<string, string> | null,
    path: string,
  ): void {
    if (altText === null) {
      return;
    }

    if (typeof altText !== 'object' || Array.isArray(altText)) {
      throw new BadRequestException(`${path} must be a locale-to-string object.`);
    }

    for (const [locale, value] of Object.entries(altText)) {
      if (!LOCALE_CODE_PATTERN.test(locale)) {
        throw new BadRequestException(`${path} locale "${locale}" is invalid.`);
      }

      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new BadRequestException(`${path}["${locale}"] must be a non-empty string.`);
      }

      if (value.length > 255) {
        throw new BadRequestException(
          `${path}["${locale}"] must be at most 255 characters long.`,
        );
      }
    }
  }

  private toAdminMediaItemResponse(tour: TourEntity, item: TourMediaEntity): {
    mediaId: string;
    mediaType: 'image' | 'video';
    storagePath: string;
    contentUrl: string;
    contentType: string;
    size: number;
    originalFilename: string;
    altText: Record<string, string> | null;
    orderIndex: number;
  } {
    return {
      mediaId: item.mediaId,
      mediaType: item.media.mediaType,
      storagePath: item.media.storagePath,
      contentUrl: this.buildAdminMediaContentUrl(item.mediaId),
      contentType: item.media.contentType,
      size: item.media.size,
      originalFilename: item.media.originalFilename,
      altText: item.altText ?? null,
      orderIndex: item.orderIndex,
    };
  }

  private buildAdminMediaContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/admin/media/${mediaId}/content`;
  }
}
