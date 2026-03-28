import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { STORAGE_SERVICE, StorageService } from '../storage/storage-service.interface';
import { TagEntity } from '../tags/tag.entity';
import { PublicListToursDto } from './dto/list-tours.dto';
import { TourMediaEntity } from './entities/tour-media.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';

const REQUIRED_LOCALIZED_LIST_FIELDS = [
  'highlights',
  'included',
  'notIncluded',
] as const;

interface TourListFilters {
  tagKeys?: string[];
  tourTypes?: string[];
}

@Injectable()
export class PublicToursService {
  private readonly logger = new Logger(PublicToursService.name);

  constructor(
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(TourTranslationEntity)
    private readonly translationsRepository: Repository<TourTranslationEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    private readonly payloadValidationService: TourPayloadValidationService,
  ) {}

  async findAll(locale: string, filters: PublicListToursDto): Promise<unknown[]> {
    await this.assertPublicLocale(locale);

    const tours = await this.buildListQuery(filters).getMany();

    return tours
      .map((tour) => this.toPublicResponse(tour, locale))
      .filter((tour): tour is NonNullable<typeof tour> => tour !== null);
  }

  async findOneBySlug(slug: string, locale: string): Promise<unknown> {
    await this.assertPublicLocale(locale);

    const translation = await this.translationsRepository.findOne({
      where: { slug },
      relations: {
        tour: {
          mediaItems: {
            media: true,
          },
          tags: true,
          stops: true,
          translations: true,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Tour "${slug}" was not found.`);
    }

    if (translation.languageCode !== locale) {
      throw new NotFoundException(
        `Tour "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    const tour = translation.tour;
    const response = this.toPublicResponse(tour, locale);

    if (!response) {
      throw new NotFoundException(
        `Tour "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    return response;
  }

  async getMediaContent(
    slug: string,
    mediaId: string,
  ): Promise<{
    content: Buffer;
    contentType: string;
    originalFilename: string;
  }> {
    const translation = await this.translationsRepository.findOne({
      where: { slug },
      relations: {
        tour: {
          mediaItems: {
            media: true,
          },
          stops: true,
          translations: true,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException(`Tour "${slug}" was not found.`);
    }

    const tour = translation.tour;

    if (this.getSharedInvalidReason(tour)) {
      throw new NotFoundException(`Tour "${slug}" was not found.`);
    }

    const isPublic = tour.translations.some(
      (t) =>
        t.isReady &&
        t.isPublished &&
        !this.getTranslationInvalidReason(tour, t),
    );

    if (!isPublic) {
      throw new NotFoundException(`Tour "${slug}" is not publicly available.`);
    }

    const media = tour.mediaItems.find((item) => item.mediaId === mediaId)?.media;

    if (!media) {
      throw new NotFoundException(
        `Media asset "${mediaId}" is not attached to tour "${slug}".`,
      );
    }

    const stored = await this.storageService.getObject(media.storagePath);

    return {
      content: stored.content,
      contentType: stored.contentType ?? media.contentType,
      originalFilename: media.originalFilename,
    };
  }

  private async assertPublicLocale(locale: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: {
        code: locale,
        isEnabled: true,
      },
    });

    if (!language) {
      throw new NotFoundException(`Locale "${locale}" is not publicly available.`);
    }
  }

  private toPublicResponse(tour: TourEntity, locale: string): unknown | null {
    const sharedReason = this.getSharedInvalidReason(tour);
    if (sharedReason) {
      this.logger.warn(
        `Excluding tour "${tour.id}" (name: "${tour.name}") for locale "${locale}": ${sharedReason}`,
      );
      return null;
    }

    const translation = tour.translations.find(
      (entry) =>
        entry.languageCode === locale &&
        entry.isReady &&
        entry.isPublished,
    );

    if (!translation) {
      this.logger.warn(
        `Excluding tour "${tour.id}" (name: "${tour.name}") for locale "${locale}": no published and ready translation`,
      );
      return null;
    }

    const translationReason = this.getTranslationInvalidReason(tour, translation);
    if (translationReason) {
      this.logger.warn(
        `Excluding tour "${tour.id}" (name: "${tour.name}") for locale "${locale}": ${translationReason}`,
      );
      return null;
    }

    const payload = translation.payload;
    const orderedMedia = [...tour.mediaItems].sort((left, right) => left.orderIndex - right.orderIndex);
    const coverMedia =
      orderedMedia.find((item) => item.mediaId === tour.coverMediaId) ?? null;
    const galleryMedia = orderedMedia.filter((item) => item.mediaId !== tour.coverMediaId);
    const itinerary =
      tour.itineraryVariant === 'stops'
        ? {
            variant: 'stops',
            stops: [...tour.stops]
              .sort((left, right) => left.orderIndex - right.orderIndex)
              .map((stop) => ({
                id: stop.stopId,
                durationMinutes: stop.durationMinutes,
                coordinates: stop.coordinates,
                nextConnection: stop.nextConnection,
                title:
                  this.getLocalizedStops(payload)[stop.stopId]?.title ?? null,
                description:
                  this.getLocalizedStops(payload)[stop.stopId]?.description ?? null,
              })),
          }
        : {
            variant: 'description',
            itineraryDescription:
              this.getStringField(payload, 'itineraryDescription') ?? null,
          };

    return {
      id: tour.id,
      slug: translation.slug,
      coverMedia: this.toResponseMediaItem(translation.slug, coverMedia),
      galleryMedia: galleryMedia.map((item) => this.toResponseMediaItem(translation.slug, item)),
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
      durationMinutes: tour.durationMinutes,
      startPoint: {
        shared: tour.startPoint,
        localized: this.getObjectField(payload, 'startPoint'),
      },
      endPoint: {
        shared: tour.endPoint,
        localized: this.getObjectField(payload, 'endPoint'),
      },
      tags: tour.tags.map((tag: TagEntity) => ({
        key: tag.key,
        label: tag.labels[locale] ?? null,
      })),
      translation: {
        locale,
        bookingReferenceId: translation.bookingReferenceId,
        cancellationType: this.getStringField(payload, 'cancellationType'),
        highlights: this.getStringListField(payload, 'highlights'),
        included: this.getStringListField(payload, 'included'),
        notIncluded: this.getStringListField(payload, 'notIncluded'),
        payload,
      },
      itinerary,
    };
  }

  private getTranslationInvalidReason(
    tour: TourEntity,
    translation: TourTranslationEntity,
  ): string | null {
    try {
      if (!tour.contentSchema || !tour.itineraryVariant) {
        return 'missing contentSchema or itineraryVariant';
      }

      this.payloadValidationService.validateOrThrow(
        tour.contentSchema,
        translation.payload,
      );

      const missingLists = this.getMissingRequiredLocalizedLists(translation.payload);
      if (missingLists.length > 0) {
        return `missing required lists [${missingLists.join(', ')}]`;
      }

      if (tour.itineraryVariant === 'stops') {
        const localizedStops = this.getLocalizedStops(translation.payload);
        const sharedStopIds = new Set(tour.stops.map((stop) => stop.stopId));

        for (const stopId of sharedStopIds) {
          const localizedStop = localizedStops[stopId];

          if (
            !localizedStop ||
            typeof localizedStop.title !== 'string' ||
            typeof localizedStop.description !== 'string'
          ) {
            return `missing or incomplete stop "${stopId}"`;
          }
        }
      }

      return null;
    } catch (error) {
      return `payload validation failed — ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private getSharedInvalidReason(tour: TourEntity): string | null {
    if (!tour.contentSchema || !tour.itineraryVariant) {
      return 'missing contentSchema or itineraryVariant';
    }

    if (tour.rating === null || tour.reviewCount === null || tour.durationMinutes === null) {
      return 'missing rating, reviewCount, or durationMinutes';
    }

    if (tour.tourType === 'company') {
      return null;
    }

    if (tour.tourType !== 'tip_based' && (!tour.priceAmount || !tour.priceCurrency)) {
      return 'non-tip-based tour missing price';
    }

    if (tour.tourType === 'tip_based' && (tour.priceAmount || tour.priceCurrency)) {
      return 'tip-based tour should not have a price';
    }

    if (tour.itineraryVariant === 'stops' && tour.stops.length === 0) {
      return 'stop-based itinerary has no stops';
    }

    return null;
  }

  private getLocalizedStops(
    payload: Record<string, unknown>,
  ): Record<string, { title?: string; description?: string }> {
    const value = payload.itineraryStops;

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, { title?: string; description?: string }>;
  }

  private getMissingRequiredLocalizedLists(payload: Record<string, unknown>): string[] {
    return REQUIRED_LOCALIZED_LIST_FIELDS.filter((field) => {
      const value = payload[field];

      return !Array.isArray(value) || value.some((entry) => typeof entry !== 'string');
    });
  }

  private getObjectField(
    payload: Record<string, unknown>,
    key: string,
  ): Record<string, unknown> | null {
    const value = payload[key];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private getStringField(payload: Record<string, unknown>, key: string): string | null {
    const value = payload[key];
    return typeof value === 'string' ? value : null;
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

  private toResponseMediaItem(tourSlug: string, item: TourMediaEntity | null): {
    mediaId: string;
    mediaType: 'image' | 'video';
    storagePath: string;
    contentUrl: string;
    contentType: string;
    size: number;
    originalFilename: string;
    altText: Record<string, string> | null;
    orderIndex: number;
  } | null {
    if (!item) {
      return null;
    }

    return {
      mediaId: item.mediaId,
      mediaType: item.media.mediaType,
      storagePath: item.media.storagePath,
      contentUrl: this.buildContentUrl(tourSlug, item.mediaId),
      contentType: item.media.contentType,
      size: item.media.size,
      originalFilename: item.media.originalFilename,
      altText: item.altText ?? null,
      orderIndex: item.orderIndex,
    };
  }

  private buildContentUrl(tourSlug: string, mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/public/tours/${encodeURIComponent(tourSlug)}/media/${mediaId}`;
  }

  private buildListQuery(filters: TourListFilters): SelectQueryBuilder<TourEntity> {
    const query = this.toursRepository
      .createQueryBuilder('tour')
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
}
