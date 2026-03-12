import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';

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
        publishedAt: 'DESC',
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
    if (tour.publicationStatus !== 'published' || tour.isHidden) {
      return null;
    }

    const translation = tour.translations.find(
      (entry) =>
        entry.languageCode === locale &&
        entry.translationStatus === 'ready' &&
        entry.publicationStatus === 'published' &&
        !entry.isHidden,
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
      category: tour.category,
      coverMediaRef: tour.coverMediaRef,
      galleryMediaRefs: tour.galleryMediaRefs,
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
        payload,
      },
      itinerary,
      publishedAt: tour.publishedAt,
    };
  }

  private isTranslationPubliclyValid(
    tour: TourEntity,
    translation: TourTranslationEntity,
  ): boolean {
    try {
      this.payloadValidationService.validateOrThrow(
        tour.contentSchema,
        translation.payload,
      );

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

  private getLocalizedStops(
    payload: Record<string, unknown>,
  ): Record<string, { title?: string; description?: string }> {
    const value = payload.itineraryStops;

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, { title?: string; description?: string }>;
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
}
