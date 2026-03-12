import { NotFoundException } from '@nestjs/common';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { PublicToursService } from './public-tours.service';
import { TourPayloadValidationService } from './tour-payload-validation.service';

describe('PublicToursService', () => {
  let service: PublicToursService;
  let toursRepository: RepositoryMock<TourEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let payloadValidationService: jest.Mocked<TourPayloadValidationService>;

  beforeEach(() => {
    toursRepository = createRepositoryMock<TourEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    payloadValidationService = {
      validateOrThrow: jest.fn(),
    } as unknown as jest.Mocked<TourPayloadValidationService>;

    service = new PublicToursService(
      toursRepository as never,
      languagesRepository as never,
      payloadValidationService,
    );
  });

  it('returns only publicly available localized tours with descriptive itinerary payloads', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    toursRepository.find.mockResolvedValue([
      createPublicTour(),
      createPublicTour({
        slug: 'hidden-tour',
        isHidden: true,
      }),
      createPublicTour({
        slug: 'draft-translation-tour',
        translations: [
          createTranslationEntity({
            languageCode: 'en',
            translationStatus: 'draft',
            publicationStatus: 'draft',
          }),
        ],
      }),
    ] as TourEntity[]);

    const result = await service.findAll('en');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'tour-1',
        slug: 'historic-center',
        price: {
          amount: 25,
          currency: 'EUR',
        },
        startPoint: {
          shared: { coordinates: { lat: 41.1, lng: 2.1 } },
          localized: { label: 'Town Hall' },
        },
        endPoint: {
          shared: { coordinates: { lat: 41.2, lng: 2.2 } },
          localized: { label: 'Canal' },
        },
        tags: [
          {
            key: 'history',
            label: 'History',
          },
        ],
        translation: {
          locale: 'en',
          bookingReferenceId: null,
          highlights: ['Roman walls', 'Gothic Quarter lanes'],
          included: ['Guide'],
          notIncluded: ['Food'],
          payload: expect.objectContaining({
            title: 'Historic Center',
            itineraryDescription: 'Walk through the old city.',
          }),
        },
        itinerary: {
          variant: 'description',
          itineraryDescription: 'Walk through the old city.',
        },
        publishedAt: new Date('2026-03-12T10:00:00.000Z'),
      }),
    ]);
  });

  it('rejects unavailable locales', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.findAll('fr')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns a localized stop-based itinerary for a valid public tour', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    toursRepository.findOne.mockResolvedValue(
      createPublicTour({
        itineraryVariant: 'stops',
        stops: [
          createStopEntity({
            stopId: 'stop-2',
            orderIndex: 1,
            durationMinutes: 25,
            coordinates: { lat: 55.2, lng: 12.2 },
            nextConnection: null,
          }),
          createStopEntity({
            stopId: 'stop-1',
            orderIndex: 0,
            durationMinutes: 10,
            coordinates: { lat: 55.1, lng: 12.1 },
            nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
          }),
        ],
        translations: [
          createTranslationEntity({
            languageCode: 'en',
            payload: {
              title: 'Historic Center',
              highlights: ['Roman walls', 'Gothic Quarter lanes'],
              included: ['Guide'],
              notIncluded: ['Food'],
              startPoint: { label: 'Town Hall' },
              endPoint: { label: 'Canal' },
              itineraryStops: {
                'stop-1': {
                  title: 'City Hall',
                  description: 'Start at the square.',
                },
                'stop-2': {
                  title: 'Cathedral',
                  description: 'End at the cathedral.',
                },
              },
            },
          }),
        ],
      }) as TourEntity,
    );

    const result = await service.findOneBySlug('historic-center', 'en');

    expect(result).toEqual(
      expect.objectContaining({
        slug: 'historic-center',
        itinerary: {
          variant: 'stops',
          stops: [
            expect.objectContaining({
              id: 'stop-1',
              durationMinutes: 10,
              title: 'City Hall',
              description: 'Start at the square.',
              nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
            }),
            expect.objectContaining({
              id: 'stop-2',
              durationMinutes: 25,
              title: 'Cathedral',
              description: 'End at the cathedral.',
              nextConnection: null,
            }),
          ],
        },
        translation: expect.objectContaining({
          locale: 'en',
          highlights: ['Roman walls', 'Gothic Quarter lanes'],
          included: ['Guide'],
          notIncluded: ['Food'],
        }),
      }),
    );
  });

  it('rejects tours whose translation payload fails validation', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    toursRepository.findOne.mockResolvedValue(createPublicTour() as TourEntity);
    payloadValidationService.validateOrThrow.mockImplementation(() => {
      throw new Error('invalid');
    });

    await expect(service.findOneBySlug('historic-center', 'en')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects published tours whose localized lists are missing', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    toursRepository.findOne.mockResolvedValue(
      createPublicTour({
        translations: [
          createTranslationEntity({
            languageCode: 'en',
            payload: {
              title: 'Historic Center',
              itineraryDescription: 'Walk through the old city.',
              startPoint: { label: 'Town Hall' },
              endPoint: { label: 'Canal' },
            },
          }),
        ],
      }) as TourEntity,
    );

    await expect(service.findOneBySlug('historic-center', 'en')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function createPublicTour(overrides: Partial<TourEntity> = {}): TourEntity {
  return {
    id: 'tour-1',
    slug: 'historic-center',
    category: 'walking',
    coverMediaRef: 'cover.jpg',
    galleryMediaRefs: ['1.jpg'],
    publicationStatus: 'published',
    isHidden: false,
    contentSchema: { type: 'object' },
    priceAmount: '25.00',
    priceCurrency: 'EUR',
    rating: '4.8',
    reviewCount: 120,
    tourType: 'group',
    cancellationType: '24h_free_cancellation',
    durationMinutes: 120,
    startPoint: { coordinates: { lat: 41.1, lng: 2.1 } },
    endPoint: { coordinates: { lat: 41.2, lng: 2.2 } },
    itineraryVariant: 'description',
    tags: [
      createTagEntity({
        key: 'history',
        labels: { en: 'History', es: 'Historia' },
      }),
    ],
    stops: [],
    translations: [
      createTranslationEntity({
        languageCode: 'en',
        payload: {
          title: 'Historic Center',
          highlights: ['Roman walls', 'Gothic Quarter lanes'],
          included: ['Guide'],
          notIncluded: ['Food'],
          itineraryDescription: 'Walk through the old city.',
          startPoint: { label: 'Town Hall' },
          endPoint: { label: 'Canal' },
        },
      }),
    ],
    publishedAt: new Date('2026-03-12T10:00:00.000Z'),
    ...overrides,
  } as TourEntity;
}

function createLanguageEntity(overrides: Partial<LanguageEntity> = {}): LanguageEntity {
  return {
    code: 'en',
    name: 'English',
    isEnabled: true,
    sortOrder: 1,
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as LanguageEntity;
}

function createTagEntity(overrides: Partial<TagEntity> = {}): TagEntity {
  return {
    key: 'history',
    labels: { en: 'History' },
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as TagEntity;
}

function createTranslationEntity(
  overrides: Partial<TourTranslationEntity> = {},
): TourTranslationEntity {
  return {
    id: 'translation-1',
    tourId: 'tour-1',
    languageCode: 'en',
    translationStatus: 'ready',
    publicationStatus: 'published',
    isHidden: false,
    bookingReferenceId: null,
    payload: {
      title: 'Historic Center',
      highlights: ['Roman walls', 'Gothic Quarter lanes'],
      included: ['Guide'],
      notIncluded: ['Food'],
      itineraryDescription: 'Walk through the center.',
    },
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as TourTranslationEntity;
}

function createStopEntity(
  overrides: Partial<TourItineraryStopEntity> = {},
): TourItineraryStopEntity {
  return {
    rowId: 'stop-row-1',
    tourId: 'tour-1',
    stopId: 'stop-1',
    orderIndex: 0,
    durationMinutes: 10,
    coordinates: { lat: 41.1, lng: 2.1 },
    nextConnection: null,
    ...overrides,
  } as TourItineraryStopEntity;
}
