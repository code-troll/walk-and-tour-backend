import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';

import { resolveTourCurrency } from '../shared/domain';
import { TourEntity } from '../tours/entities/tour.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';

/** The portal is English-only, so this is what it asks for first. */
const PREFERRED_LOCALE = 'en';

export interface HotelTourStopView {
  stopId: string;
  title: string | null;
  description: string | null;
  durationMinutes: number | null;
}

export interface HotelTourDetailView {
  tourId: string;
  name: string;
  /** What the guest is quoted, per person. Null when the tour has no price. */
  priceAmount: string | null;
  currency: string;
  durationMinutes: number | null;
  tourType: string | null;
  /** The locale the content below is actually written in — see findGranted. */
  locale: string | null;
  title: string | null;
  about: string | null;
  cancellationType: string | null;
  highlights: string[];
  included: string[];
  notIncluded: string[];
  itineraryDescription: string | null;
  /** Where the walk starts and ends, localized. Both are places a hotel searches by. */
  startPoint: string | null;
  endPoint: string | null;
  /** Tag labels in the content locale, falling back to the key. */
  tags: string[];
  stops: HotelTourStopView[];
}

/**
 * A granted tour, as the partner selling it needs to see it.
 *
 * This deliberately does not reuse the public read model. That one gates on
 * `isReady && isPublished` and validates the payload against the content
 * schema, because a tour that fails those checks must not appear on the public
 * site. Here the grant is the authorisation: a hotel granted a private tour is
 * meant to sell it, and refusing to describe it because it is not published to
 * the world would be the wrong answer to a different question.
 *
 * What it keeps from the public model is the shape of the content, so a partner
 * reads the same "about", itinerary and inclusions a guest would.
 */
@Injectable()
export class HotelToursService {
  constructor(
    @InjectRepository(HotelTourEntity)
    private readonly grantsRepository: Repository<HotelTourEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
  ) {}

  /**
   * One granted tour, with its content.
   *
   * The hotel comes from the token and goes into the WHERE, so a tour granted
   * to somebody else is not a 403 that confirms it exists — it is a 404 that
   * says nothing.
   */
  async findGranted(hotelId: string, tourId: string): Promise<HotelTourDetailView> {
    const grant = await this.grantsRepository.findOne({
      where: { hotelId, tourId, revokedAt: IsNull() },
    });

    if (!grant) {
      throw new NotFoundException('Tour not found.');
    }

    const tour = await this.toursRepository.findOne({
      where: { id: tourId },
      relations: { translations: true, stops: true, tags: true },
    });

    if (!tour) {
      throw new NotFoundException('Tour not found.');
    }

    return this.toDetailView(tour, grant.priceAmount ?? null);
  }

  /**
   * Every live grant, in full.
   *
   * The portal searches these client-side rather than through a query string:
   * a hotel holds a handful of grants, the whole set is a few kilobytes of
   * text, and filtering in the browser is instant and matches on everything at
   * once — an itinerary stop, a highlight, a tag — without a round trip per
   * keystroke or a `LIKE` over a JSONB payload.
   */
  async listGranted(hotelId: string): Promise<HotelTourDetailView[]> {
    const grants = await this.grantsRepository.find({
      where: { hotelId, revokedAt: IsNull() },
      order: { grantedAt: 'ASC' },
    });

    if (grants.length === 0) {
      return [];
    }

    const tours = await this.toursRepository.find({
      where: { id: In(grants.map((grant) => grant.tourId)) },
      relations: { translations: true, stops: true, tags: true },
    });

    const byId = new Map(tours.map((tour) => [tour.id, tour]));

    return grants
      .map((grant) => {
        const tour = byId.get(grant.tourId);

        return tour ? this.toDetailView(tour, grant.priceAmount ?? null) : null;
      })
      .filter((view): view is HotelTourDetailView => view !== null);
  }

  private toDetailView(
    tour: TourEntity,
    grantPriceAmount: string | null,
  ): HotelTourDetailView {
    // English if the tour has it, otherwise whatever it does have. A partner
    // reading an Italian itinerary is worse than useful, but it beats a blank
    // panel, and `locale` lets the screen say which language it is showing.
    const translations = tour.translations ?? [];
    const translation =
      translations.find((entry) => entry.languageCode === PREFERRED_LOCALE)
      ?? translations.find((entry) => entry.isPublished)
      ?? translations[0]
      ?? null;

    const payload = translation?.payload ?? {};
    const localizedStops = this.readStopMap(payload);
    const locale = translation?.languageCode ?? null;

    return {
      tourId: tour.id,
      name: tour.name,
      priceAmount: grantPriceAmount ?? tour.priceAmount,
      currency: resolveTourCurrency(tour.priceCurrency),
      durationMinutes: tour.durationMinutes ?? null,
      tourType: tour.tourType ?? null,
      locale,
      title: this.readString(payload, 'title'),
      about: this.readString(payload, 'aboutTourDescription'),
      cancellationType: this.readString(payload, 'cancellationType'),
      highlights: this.readStringList(payload, 'highlights'),
      included: this.readStringList(payload, 'included'),
      notIncluded: this.readStringList(payload, 'notIncluded'),
      itineraryDescription: this.readString(payload, 'itineraryDescription'),
      startPoint: this.readPointLabel(payload, 'startPoint'),
      endPoint: this.readPointLabel(payload, 'endPoint'),
      tags: (tour.tags ?? []).map(
        (tag) => (locale ? tag.labels?.[locale] : null) ?? tag.labels?.en ?? tag.key,
      ),
      stops: [...(tour.stops ?? [])]
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((stop) => ({
          stopId: stop.stopId,
          title: localizedStops[stop.stopId]?.title ?? null,
          description: localizedStops[stop.stopId]?.description ?? null,
          durationMinutes: stop.durationMinutes ?? null,
        })),
    };
  }

  /** `startPoint` and `endPoint` are objects in the payload, with a label inside. */
  private readPointLabel(
    payload: Record<string, unknown>,
    field: string,
  ): string | null {
    const value = payload[field];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const label = (value as Record<string, unknown>).label;

    return typeof label === 'string' && label.trim() !== '' ? label : null;
  }

  private readString(payload: Record<string, unknown>, field: string): string | null {
    const value = payload[field];

    return typeof value === 'string' && value.trim() !== '' ? value : null;
  }

  private readStringList(payload: Record<string, unknown>, field: string): string[] {
    const value = payload[field];

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private readStopMap(
    payload: Record<string, unknown>,
  ): Record<string, { title?: string; description?: string }> {
    const value = payload.itineraryStops;

    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, { title?: string; description?: string }>)
      : {};
  }
}
