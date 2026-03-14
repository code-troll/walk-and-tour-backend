import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';

const REQUIRED_LOCALIZED_LIST_FIELDS = [
  'highlights',
  'included',
  'notIncluded',
] as const;

@Injectable()
export class PublicToursService {
  constructor(
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    private readonly payloadValidationService: TourPayloadValidationService,
  ) {}

  async findAll(locale: string): Promise<unknown[]> {
    await this.assertPublicLocale(locale);

    const tours = await this.toursRepository.find({
      relations: {
        tags: true,
        stops: true,
        translations: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });

    return tours
      .map((tour) => this.toPublicResponse(tour, locale))
      .filter((tour): tour is NonNullable<typeof tour> => tour !== null);
  }

  async findOneBySlug(slug: string, locale: string): Promise<unknown> {
    await this.assertPublicLocale(locale);

    const tour = await this.toursRepository.findOne({
      where: { slug },
      relations: {
        tags: true,
        stops: true,
        translations: true,
      },
    });

    if (!tour) {
      throw new NotFoundException(`Tour "${slug}" was not found.`);
    }

    const response = this.toPublicResponse(tour, locale);

    if (!response) {
      throw new NotFoundException(
        `Tour "${slug}" is not publicly available for locale "${locale}".`,
      );
    }

    return response;
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
    if (!this.isSharedTourPubliclyValid(tour)) {
      return null;
    }

    const translation = tour.translations.find(
      (entry) =>
        entry.languageCode === locale &&
        entry.isReady &&
        entry.isPublished,
    );

    if (!translation || !this.isTranslationPubliclyValid(tour, translation)) {
      return null;
    }

    const payload = translation.payload;
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
      slug: tour.slug,
      coverMediaRef: this.toResponseMediaAsset(tour.coverMediaRef),
      galleryMediaRefs: tour.galleryMediaRefs.map((asset) => this.toResponseMediaAsset(asset)),
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

  private isTranslationPubliclyValid(
    tour: TourEntity,
    translation: TourTranslationEntity,
  ): boolean {
    try {
      if (!tour.contentSchema || !tour.itineraryVariant) {
        return false;
      }

      this.payloadValidationService.validateOrThrow(
        tour.contentSchema,
        translation.payload,
      );

      if (this.getMissingRequiredLocalizedLists(translation.payload).length > 0) {
        return false;
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
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private isSharedTourPubliclyValid(tour: TourEntity): boolean {
    if (!tour.contentSchema || !tour.itineraryVariant) {
      return false;
    }

    if (!tour.startPoint || !tour.endPoint) {
      return false;
    }

    if (tour.rating === null || tour.reviewCount === null || tour.durationMinutes === null) {
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

  private toResponseMediaAsset(
    asset: Record<string, unknown> | null,
  ): { ref: string; altText: Record<string, string> | null } | null {
    if (!asset) {
      return null;
    }

    return {
      ref: asset.ref as string,
      altText: (asset.altText as Record<string, string> | undefined) ?? null,
    };
  }
}
