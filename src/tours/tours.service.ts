import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import {
  TOUR_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_PUBLICATION_STATUSES,
  TOUR_TRANSLATION_STATUSES,
  TOUR_TYPES,
} from '../shared/domain';
import { TagEntity } from '../tags/tag.entity';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { CreateTourDto, CreateTourTranslationDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';

const REQUIRED_LOCALIZED_LIST_FIELDS = [
  'highlights',
  'included',
  'notIncluded',
] as const;

interface TourAggregateInput {
  name: string;
  slug: string;
  category?: string;
  coverMediaRef?: string | null;
  galleryMediaRefs: string[];
  publicationStatus: string;
  contentSchema: Record<string, unknown>;
  price?: { amount: number; currency: string } | null;
  rating: number;
  reviewCount: number;
  tourType: string;
  cancellationType: string;
  durationMinutes: number;
  startPoint: Record<string, unknown>;
  endPoint: Record<string, unknown>;
  itinerary: {
    variant: 'description' | 'stops';
    stops?: Array<{
      id: string;
      durationMinutes?: number;
      coordinates?: Record<string, number>;
      nextConnection?: Record<string, unknown>;
    }>;
  };
  tagKeys: string[];
  translations: CreateTourTranslationDto[];
}

interface JsonCoordinates {
  lat: number;
  lng: number;
}

interface JsonPoint {
  coordinates?: JsonCoordinates;
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
    @InjectRepository(TagEntity)
    private readonly tagsRepository: Repository<TagEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    private readonly schemaPolicyService: TourSchemaPolicyService,
    private readonly payloadValidationService: TourPayloadValidationService,
  ) {}

  async findAll(): Promise<unknown[]> {
    const tours = await this.toursRepository.find({
      relations: {
        tags: true,
        stops: true,
        translations: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

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
    const existing = await this.toursRepository.findOne({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Tour slug "${dto.slug}" already exists.`);
    }

    const aggregate = await this.buildAggregate(dto);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);
    await this.validateTranslations(aggregate);

    const tour = this.toursRepository.create({
      name: aggregate.name,
      slug: aggregate.slug,
      category: aggregate.category ?? null,
      coverMediaRef: aggregate.coverMediaRef ?? null,
      galleryMediaRefs: aggregate.galleryMediaRefs,
      publicationStatus: aggregate.publicationStatus,
      contentSchema: aggregate.contentSchema,
      priceAmount: aggregate.price ? aggregate.price.amount.toFixed(2) : null,
      priceCurrency: aggregate.price?.currency ?? null,
      rating: aggregate.rating.toFixed(2),
      reviewCount: aggregate.reviewCount,
      tourType: aggregate.tourType,
      cancellationType: aggregate.cancellationType,
      durationMinutes: aggregate.durationMinutes,
      startPoint: aggregate.startPoint,
      endPoint: aggregate.endPoint,
      itineraryVariant: aggregate.itinerary.variant,
      tags,
      createdBy: actor.id,
      updatedBy: actor.id,
      publishedBy:
        aggregate.publicationStatus === 'published'
          ? actor.id
          : null,
      publishedAt:
        aggregate.publicationStatus === 'published' ? new Date() : null,
    });

    const savedTour = await this.toursRepository.save(tour);
    await this.replaceStops(savedTour.id, aggregate);
    await this.replaceTranslations(savedTour.id, aggregate.translations);

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

    const previousPublicationStatus = existing.publicationStatus;
    const aggregate = await this.buildAggregate(dto, existing);
    const tags = await this.getTagsOrThrow(aggregate.tagKeys);
    await this.validateTranslations(aggregate);

    existing.name = aggregate.name;
    existing.slug = aggregate.slug;
    existing.category = aggregate.category ?? null;
    existing.coverMediaRef = aggregate.coverMediaRef ?? null;
    existing.galleryMediaRefs = aggregate.galleryMediaRefs;
    existing.publicationStatus = aggregate.publicationStatus;
    existing.contentSchema = aggregate.contentSchema;
    existing.priceAmount = aggregate.price ? aggregate.price.amount.toFixed(2) : null;
    existing.priceCurrency = aggregate.price?.currency ?? null;
    existing.rating = aggregate.rating.toFixed(2);
    existing.reviewCount = aggregate.reviewCount;
    existing.tourType = aggregate.tourType;
    existing.cancellationType = aggregate.cancellationType;
    existing.durationMinutes = aggregate.durationMinutes;
    existing.startPoint = aggregate.startPoint;
    existing.endPoint = aggregate.endPoint;
    existing.itineraryVariant = aggregate.itinerary.variant;
    existing.tags = tags;
    existing.updatedBy = actor.id;

    if (
      aggregate.publicationStatus === 'published' &&
      previousPublicationStatus !== 'published'
    ) {
      existing.publishedAt = new Date();
      existing.publishedBy = actor.id;
    } else if (aggregate.publicationStatus === 'published') {
      existing.publishedAt = existing.publishedAt ?? new Date();
      existing.publishedBy = existing.publishedBy ?? actor.id;
    } else {
      existing.publishedAt = null;
      existing.publishedBy = null;
    }

    await this.toursRepository.save(existing);
    await this.replaceStops(existing.id, aggregate);
    await this.upsertTranslations(existing.id, existing.translations, aggregate.translations);

    return this.findOne(existing.id);
  }

  private async buildAggregate(
    source: CreateTourDto | UpdateTourDto,
    existing?: TourEntity,
  ): Promise<TourAggregateInput> {
    const contentSchema = this.schemaPolicyService.validateOrThrow(
      source.contentSchema ?? existing?.contentSchema,
    );

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

    const aggregate: TourAggregateInput = {
      name: source.name ?? existing?.name ?? '',
      slug: source.slug ?? existing?.slug ?? '',
      category:
        'category' in source
          ? (source.category ?? undefined)
          : (existing?.category ?? undefined),
      coverMediaRef:
        'coverMediaRef' in source
          ? (source.coverMediaRef ?? null)
          : (existing?.coverMediaRef ?? null),
      galleryMediaRefs: source.galleryMediaRefs ?? existing?.galleryMediaRefs ?? [],
      publicationStatus:
        source.publicationStatus ?? existing?.publicationStatus ?? TOUR_PUBLICATION_STATUSES[0],
      contentSchema,
      price:
        source.price === null
          ? null
          : source.price
            ? source.price
            : this.getExistingPrice(existing),
      rating: source.rating ?? Number(existing?.rating ?? 0),
      reviewCount: source.reviewCount ?? existing?.reviewCount ?? 0,
      tourType: source.tourType ?? existing?.tourType ?? TOUR_TYPES[0],
      cancellationType:
        source.cancellationType ?? existing?.cancellationType ?? '',
      durationMinutes: source.durationMinutes ?? existing?.durationMinutes ?? 0,
      startPoint: source.startPoint
        ? this.toJsonPoint(source.startPoint)
        : (existing?.startPoint ?? {}),
      endPoint: source.endPoint
        ? this.toJsonPoint(source.endPoint)
        : (existing?.endPoint ?? {}),
      itinerary,
      tagKeys: source.tagKeys ?? existing?.tags.map((tag) => tag.key) ?? [],
      translations: this.mergeTranslations(existing, source.translations),
    };

    this.validateSharedRules(aggregate);

    return aggregate;
  }

  private validateSharedRules(aggregate: TourAggregateInput): void {
    if (!aggregate.slug) {
      throw new BadRequestException('Tour slug is required.');
    }

    if (!aggregate.name || aggregate.name.trim().length === 0) {
      throw new BadRequestException('Tour name is required.');
    }

    if (!aggregate.cancellationType) {
      throw new BadRequestException('Tour cancellationType is required.');
    }

    if (!TOUR_TYPES.includes(aggregate.tourType as (typeof TOUR_TYPES)[number])) {
      throw new BadRequestException(`Tour type "${aggregate.tourType}" is invalid.`);
    }

    if (
      !TOUR_PUBLICATION_STATUSES.includes(
        aggregate.publicationStatus as (typeof TOUR_PUBLICATION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(
        `Tour publicationStatus "${aggregate.publicationStatus}" is invalid.`,
      );
    }

    if (aggregate.tourType === 'tip_based') {
      if (aggregate.price) {
        throw new BadRequestException('Tip-based tours cannot define a fixed price.');
      }
    } else if (!aggregate.price) {
      throw new BadRequestException('Paid tours must define price amount and currency.');
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

  private async validateTranslations(aggregate: TourAggregateInput): Promise<void> {
    const languageCodes = aggregate.translations.map((translation) => translation.languageCode);

    if (languageCodes.length > 0) {
      const languages = await this.languagesRepository.findBy({
        code: In(languageCodes),
      });

      if (languages.length !== new Set(languageCodes).size) {
        const registered = new Set(languages.map((language) => language.code));
        const missing = [...new Set(languageCodes)].filter((code) => !registered.has(code));
        throw new BadRequestException(
          `Translations reference unknown language codes: ${missing.join(', ')}`,
        );
      }
    }

    const draftSchema = this.schemaPolicyService.createDraftSchema(aggregate.contentSchema) as Record<
      string,
      unknown
    >;

    for (const translation of aggregate.translations) {
      if (
        !TOUR_TRANSLATION_STATUSES.includes(
          translation.translationStatus as (typeof TOUR_TRANSLATION_STATUSES)[number],
        )
      ) {
        throw new BadRequestException(
          `Translation status "${translation.translationStatus}" is invalid.`,
        );
      }

      if (
        !TOUR_TRANSLATION_PUBLICATION_STATUSES.includes(
          translation.publicationStatus as (typeof TOUR_TRANSLATION_PUBLICATION_STATUSES)[number],
        )
      ) {
        throw new BadRequestException(
          `Translation publicationStatus "${translation.publicationStatus}" is invalid.`,
        );
      }

      if (
        translation.publicationStatus === 'published' &&
        translation.translationStatus !== 'ready'
      ) {
        throw new BadRequestException(
          `Translation "${translation.languageCode}" cannot be published until it is ready.`,
        );
      }

      const requiresFullValidation =
        translation.translationStatus === 'ready' ||
        translation.publicationStatus === 'published';

      this.payloadValidationService.validateOrThrow(
        requiresFullValidation ? aggregate.contentSchema : draftSchema,
        translation.payload,
      );

      const missingRequiredLists = requiresFullValidation
        ? this.getMissingRequiredLocalizedLists(translation.payload)
        : [];

      if (missingRequiredLists.length > 0) {
        throw new BadRequestException(
          `Translation "${translation.languageCode}" is missing required localized lists: ${missingRequiredLists.join(', ')}`,
        );
      }

      if (aggregate.itinerary.variant === 'stops') {
        const missingStops = this.getMissingLocalizedStops(aggregate, translation);

        if (requiresFullValidation && missingStops.length > 0) {
          throw new BadRequestException(
            `Translation "${translation.languageCode}" is missing localized stops: ${missingStops.join(', ')}`,
          );
        }
      }
    }
  }

  private getMissingLocalizedStops(
    aggregate: TourAggregateInput,
    translation: CreateTourTranslationDto,
  ): string[] {
    const sharedStopIds = new Set(aggregate.itinerary.stops?.map((stop) => stop.id) ?? []);
    const itineraryStops = translation.payload.itineraryStops;

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

  private async replaceStops(id: string, aggregate: TourAggregateInput): Promise<void> {
    await this.stopsRepository.delete({ tourId: id });

    if (aggregate.itinerary.variant !== 'stops' || !aggregate.itinerary.stops) {
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

  private async replaceTranslations(
    id: string,
    translations: CreateTourTranslationDto[],
  ): Promise<void> {
    if (translations.length === 0) {
      return;
    }

    const entities = translations.map((translation) =>
      this.translationsRepository.create({
        tourId: id,
        languageCode: translation.languageCode,
        translationStatus: translation.translationStatus,
        publicationStatus: translation.publicationStatus,
        bookingReferenceId: translation.bookingReferenceId ?? null,
        payload: translation.payload,
      }),
    );

    await this.translationsRepository.save(entities);
  }

  private async upsertTranslations(
    id: string,
    existingTranslations: TourTranslationEntity[],
    incomingTranslations: CreateTourTranslationDto[],
  ): Promise<void> {
    const existingByCode = new Map(
      existingTranslations.map((translation) => [translation.languageCode, translation]),
    );

    for (const incoming of incomingTranslations) {
      const existing = existingByCode.get(incoming.languageCode);

      if (existing) {
        existing.translationStatus = incoming.translationStatus;
        existing.publicationStatus = incoming.publicationStatus;
        existing.bookingReferenceId = incoming.bookingReferenceId ?? null;
        existing.payload = incoming.payload;
        await this.translationsRepository.save(existing);
      } else {
        await this.translationsRepository.save(
          this.translationsRepository.create({
            tourId: id,
            languageCode: incoming.languageCode,
            translationStatus: incoming.translationStatus,
            publicationStatus: incoming.publicationStatus,
            bookingReferenceId: incoming.bookingReferenceId ?? null,
            payload: incoming.payload,
          }),
        );
      }
    }
  }

  private mergeTranslations(
    existing: TourEntity | undefined,
    incoming: CreateTourTranslationDto[] | undefined,
  ): CreateTourTranslationDto[] {
    const merged = new Map<string, CreateTourTranslationDto>();

    for (const translation of existing?.translations ?? []) {
      merged.set(translation.languageCode, {
        languageCode: translation.languageCode,
        translationStatus: translation.translationStatus,
        publicationStatus: translation.publicationStatus,
        bookingReferenceId: translation.bookingReferenceId ?? undefined,
        payload: translation.payload,
      });
    }

    for (const translation of incoming ?? []) {
      merged.set(translation.languageCode, translation);
    }

    return [...merged.values()];
  }

  private getExistingItinerary(existing: TourEntity | undefined): TourAggregateInput['itinerary'] {
    if (!existing) {
      return { variant: 'description' };
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

  private async findEntityOrThrow(id: string): Promise<TourEntity> {
    const tour = await this.toursRepository.findOne({
      where: { id },
      relations: {
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

  private toAdminResponse(tour: TourEntity): unknown {
    const orderedStops = [...tour.stops].sort((left, right) => left.orderIndex - right.orderIndex);

    const translations = Object.fromEntries(
      tour.translations.map((translation) => [
        translation.languageCode,
        {
          translationStatus: translation.translationStatus,
          publicationStatus: translation.publicationStatus,
          bookingReferenceId: translation.bookingReferenceId,
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
          ? this.getMissingLocalizedStops(
              {
                name: tour.name,
                slug: tour.slug,
                category: tour.category ?? undefined,
                coverMediaRef: tour.coverMediaRef,
                galleryMediaRefs: tour.galleryMediaRefs,
                publicationStatus: tour.publicationStatus,
                contentSchema: tour.contentSchema,
                price: this.getExistingPrice(tour),
                rating: Number(tour.rating),
                reviewCount: tour.reviewCount,
                tourType: tour.tourType,
                cancellationType: tour.cancellationType,
                durationMinutes: tour.durationMinutes,
                startPoint: tour.startPoint,
                endPoint: tour.endPoint,
                itinerary: {
                  variant: 'stops',
                  stops: orderedStops.map((stop) => ({
                    id: stop.stopId,
                    durationMinutes: stop.durationMinutes ?? undefined,
                    coordinates: stop.coordinates ?? undefined,
                    nextConnection: stop.nextConnection ?? undefined,
                  })),
                },
                tagKeys: tour.tags.map((tag) => tag.key),
                translations: [],
              },
              {
                languageCode: translation.languageCode,
                translationStatus: translation.translationStatus,
                publicationStatus: translation.publicationStatus,
                bookingReferenceId: translation.bookingReferenceId ?? undefined,
                payload: translation.payload,
              },
            )
          : [];

      const isSchemaValid = this.isTranslationPayloadValid(tour, translation);

      return {
        languageCode: translation.languageCode,
        translationStatus: translation.translationStatus,
        publicationStatus: translation.publicationStatus,
        missingRequiredLists,
        missingStopTranslations,
        isSchemaValid,
        publiclyAvailable:
          tour.publicationStatus === 'published' &&
          translation.translationStatus === 'ready' &&
          translation.publicationStatus === 'published' &&
          missingRequiredLists.length === 0 &&
          isSchemaValid &&
          missingStopTranslations.length === 0,
      };
    });

    return {
      id: tour.id,
      name: tour.name,
      slug: tour.slug,
      category: tour.category,
      coverMediaRef: tour.coverMediaRef,
      galleryMediaRefs: tour.galleryMediaRefs,
      publicationStatus: tour.publicationStatus,
      contentSchema: tour.contentSchema,
      price:
        tour.priceAmount && tour.priceCurrency
          ? {
              amount: Number(tour.priceAmount),
              currency: tour.priceCurrency,
            }
          : null,
      rating: Number(tour.rating),
      reviewCount: tour.reviewCount,
      tourType: tour.tourType,
      cancellationType: tour.cancellationType,
      durationMinutes: tour.durationMinutes,
      startPoint: tour.startPoint,
      endPoint: tour.endPoint,
      itinerary: {
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
      },
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
        publishedBy: tour.publishedBy,
        createdAt: tour.createdAt,
        updatedAt: tour.updatedAt,
        publishedAt: tour.publishedAt,
      },
    };
  }

  private isTranslationPayloadValid(
    tour: TourEntity,
    translation: TourTranslationEntity,
  ): boolean {
    try {
      const schema =
        translation.translationStatus === 'ready' ||
        translation.publicationStatus === 'published'
          ? tour.contentSchema
          : (this.schemaPolicyService.createDraftSchema(tour.contentSchema) as Record<
              string,
              unknown
            >);

      this.payloadValidationService.validateOrThrow(schema, translation.payload);

      if (
        (translation.translationStatus === 'ready' ||
          translation.publicationStatus === 'published') &&
        this.getMissingRequiredLocalizedLists(translation.payload).length > 0
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
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
}
