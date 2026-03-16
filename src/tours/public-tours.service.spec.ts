import { NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { StorageService } from '../storage/storage-service.interface';
import { TagEntity } from '../tags/tag.entity';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourMediaEntity } from './entities/tour-media.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { PublicToursService } from './public-tours.service';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { MediaAssetEntity } from '../media/media-asset.entity';

describe('PublicToursService', () => {
  let service: PublicToursService;
  let toursRepository: RepositoryMock<TourEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let payloadValidationService: jest.Mocked<TourPayloadValidationService>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    toursRepository = createRepositoryMock<TourEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    payloadValidationService = {
      validateOrThrow: jest.fn(),
    } as unknown as jest.Mocked<TourPayloadValidationService>;
    storageService = {
      putObject: jest.fn(),
      getObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn((path: string) => `http://api.dev.walkandtour.dk:3000/media/${path}`),
    };

    service = new PublicToursService(
      toursRepository as never,
      languagesRepository as never,
      storageService,
      payloadValidationService,
    );
  });

  it('returns only publicly available localized tours with descriptive itinerary payloads', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    const { queryBuilder } = createListQueryBuilderMock([
      createPublicTour(),
      createPublicTour({
        slug: 'draft-translation-tour',
        translations: [
          createTranslationEntity({
            languageCode: 'en',
            isReady: false,
            isPublished: false,
          }),
        ],
      }),
    ] as TourEntity[]);
    toursRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findAll('en', { locale: 'en' });

    expect(queryBuilder.orderBy).toHaveBeenCalledWith('tour.sortOrder', 'ASC');
    expect(result).toEqual([
      expect.objectContaining({
        id: 'tour-1',
        slug: 'historic-center',
        coverMedia: expect.objectContaining({
          mediaId: 'media-1',
          mediaType: 'image',
          storagePath: 'cover.jpg',
          contentUrl: 'http://api.dev.walkandtour.dk:3000/api/public/tours/historic-center/media/media-1',
          altText: {
            en: 'Historic center skyline',
          },
        }),
        galleryMedia: [
          expect.objectContaining({
            mediaId: 'media-2',
            storagePath: '1.jpg',
            contentUrl: 'http://api.dev.walkandtour.dk:3000/api/public/tours/historic-center/media/media-2',
            altText: {
              en: 'Stone alley in the old town',
            },
          }),
        ],
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
          cancellationType: 'Free cancellation up to 24 hours before the start time.',
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
      }),
    ]);
    expect(toursRepository.find).not.toHaveBeenCalled();
  });

  it('filters public tour listings by tags and tour types', async () => {
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en', isEnabled: true }),
    );
    const { queryBuilder, subQueryBuilder } = createListQueryBuilderMock([
      createPublicTour({
        id: 'tour-company-1',
        slug: 'company-experience',
        tourType: 'company',
        tags: [
          createTagEntity({
            key: 'history',
            labels: { en: 'History' },
          }),
        ],
      }),
      createPublicTour({
        id: 'tour-group-1',
        slug: 'group-architecture',
        tourType: 'group',
        tags: [
          createTagEntity({
            key: 'architecture',
            labels: { en: 'Architecture' },
          }),
        ],
      }),
    ] as TourEntity[]);
    toursRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await service.findAll('en', {
      locale: 'en',
      tagKeys: ['history'],
      tourTypes: ['company'],
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'tour.tourType IN (:...tourTypes)',
      { tourTypes: ['company'] },
    );
    expect(subQueryBuilder.andWhere).toHaveBeenCalledWith(
      'tour_tags_filter.tag_key IN (:...tagKeys)',
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'EXISTS (SELECT 1)',
      { tagKeys: ['history'] },
    );
    expect(toursRepository.find).not.toHaveBeenCalled();
  });

  it('rejects unavailable locales', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.findAll('fr', { locale: 'fr' })).rejects.toBeInstanceOf(NotFoundException);
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
              cancellationType: 'Free cancellation up to 24 hours before the start time.',
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
});

function createPublicTour(overrides: Partial<TourEntity> = {}): TourEntity {
  return {
    id: 'tour-1',
    name: 'Historic Center Main Tour',
    sortOrder: 0,
    slug: 'historic-center',
    coverMediaId: 'media-1',
    coverMedia: createMediaAssetEntity({ id: 'media-1', storagePath: 'cover.jpg' }),
    mediaItems: [
      createTourMediaEntity({
        mediaId: 'media-1',
        orderIndex: 0,
        altText: { en: 'Historic center skyline' },
        media: createMediaAssetEntity({ id: 'media-1', storagePath: 'cover.jpg' }),
      }),
      createTourMediaEntity({
        rowId: 'tour-media-2',
        mediaId: 'media-2',
        orderIndex: 1,
        altText: { en: 'Stone alley in the old town' },
        media: createMediaAssetEntity({
          id: 'media-2',
          storagePath: '1.jpg',
          originalFilename: '1.jpg',
        }),
      }),
    ],
    contentSchema: { type: 'object' },
    priceAmount: '25.00',
    priceCurrency: 'EUR',
    rating: '4.8',
    reviewCount: 120,
    tourType: 'group',
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
          cancellationType: 'Free cancellation up to 24 hours before the start time.',
          highlights: ['Roman walls', 'Gothic Quarter lanes'],
          included: ['Guide'],
          notIncluded: ['Food'],
          itineraryDescription: 'Walk through the old city.',
          startPoint: { label: 'Town Hall' },
          endPoint: { label: 'Canal' },
        },
      }),
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
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
    isReady: true,
    isPublished: true,
    bookingReferenceId: null,
    payload: {
      title: 'Historic Center',
      cancellationType: 'Free cancellation up to 24 hours before the start time.',
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

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'cover.jpg',
    contentType: 'image/jpeg',
    size: 1024,
    originalFilename: 'cover.jpg',
    createdBy: 'admin-1',
    tourUsages: [],
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as MediaAssetEntity;
}

function createTourMediaEntity(
  overrides: Partial<TourMediaEntity> = {},
): TourMediaEntity {
  return {
    rowId: 'tour-media-1',
    tourId: 'tour-1',
    mediaId: 'media-1',
    orderIndex: 0,
    altText: { en: 'Historic center skyline' },
    media: createMediaAssetEntity(),
    tour: {} as TourEntity,
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as TourMediaEntity;
}

function createListQueryBuilderMock<T>(results: T[]) {
  const subQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('(SELECT 1)'),
  };

  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    subQuery: jest.fn().mockReturnValue(subQueryBuilder),
    getMany: jest.fn().mockResolvedValue(results),
  };

  return {
    queryBuilder,
    subQueryBuilder,
  };
}
