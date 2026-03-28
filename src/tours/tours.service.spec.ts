import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourMediaEntity } from './entities/tour-media.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { ToursService } from './tours.service';

describe('ToursService', () => {
  let service: ToursService;
  let toursRepository: RepositoryMock<TourEntity>;
  let stopsRepository: RepositoryMock<TourItineraryStopEntity>;
  let translationsRepository: RepositoryMock<TourTranslationEntity>;
  let tourMediaRepository: RepositoryMock<TourMediaEntity>;
  let mediaAssetsRepository: RepositoryMock<MediaAssetEntity>;
  let tagsRepository: RepositoryMock<TagEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let schemaPolicyService: jest.Mocked<TourSchemaPolicyService>;
  let payloadValidationService: jest.Mocked<TourPayloadValidationService>;

  beforeEach(() => {
    toursRepository = createRepositoryMock<TourEntity>();
    stopsRepository = createRepositoryMock<TourItineraryStopEntity>();
    translationsRepository = createRepositoryMock<TourTranslationEntity>();
    tourMediaRepository = createRepositoryMock<TourMediaEntity>();
    mediaAssetsRepository = createRepositoryMock<MediaAssetEntity>();
    tagsRepository = createRepositoryMock<TagEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    schemaPolicyService = {
      validateOrThrow: jest.fn((value) => value as Record<string, unknown>),
      createDraftSchema: jest.fn((value) => value as Record<string, unknown>),
    } as unknown as jest.Mocked<TourSchemaPolicyService>;
    payloadValidationService = {
      validateOrThrow: jest.fn(),
    } as unknown as jest.Mocked<TourPayloadValidationService>;
    service = new ToursService(
      toursRepository as never,
      stopsRepository as never,
      translationsRepository as never,
      tourMediaRepository as never,
      mediaAssetsRepository as never,
      tagsRepository as never,
      languagesRepository as never,
      schemaPolicyService,
      payloadValidationService,
    );
  });

  it('creates a minimal tour shell without translations or media', async () => {
    const persistedTour = createTourEntity({
      contentSchema: null,
      priceAmount: null,
      priceCurrency: null,
      rating: null,
      reviewCount: null,
      durationMinutes: null,
      startPoint: null,
      endPoint: null,
      itineraryVariant: null,
      tags: [],
      translations: [],
      mediaItems: [],
      coverMediaId: null,
    });

    toursRepository.findOne.mockResolvedValueOnce(persistedTour);
    toursRepository.manager.find.mockResolvedValue([]);
    toursRepository.manager.save.mockImplementation(async (_entity, value) => [
      {
        ...(value as TourEntity[])[0],
        id: 'tour-1',
      },
    ]);

    const result = await service.create(
      {
        name: 'Historic Center Main Tour',
        tourType: 'group',
      },
      createAdmin(),
    );

    expect(toursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Historic Center Main Tour',
        tourType: 'group',
        sortOrder: 0,
        coverMediaId: null,
        contentSchema: null,
      }),
    );
    expect(toursRepository.manager.query).toHaveBeenCalledWith(
      'SET CONSTRAINTS "UQ_tours_sort_order" DEFERRED',
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-1',
        name: 'Historic Center Main Tour',
        sortOrder: 0,
        coverMediaId: null,
        mediaItems: [],
        translations: {},
        translationAvailability: [],
      }),
    );
  });

  it('filters admin tour listings by tags and tour types', async () => {
    const { queryBuilder, subQueryBuilder } = createListQueryBuilderMock([
      createTourEntity({
        id: 'tour-company-1',
        tourType: 'company',
        tags: [createTagEntity({ key: 'history', labels: { en: 'History' } })],
      }),
      createTourEntity({
        id: 'tour-group-1',
        tourType: 'group',
        tags: [createTagEntity({ key: 'architecture', labels: { en: 'Architecture' } })],
      }),
    ] as TourEntity[]);
    toursRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await service.findAll({
      tagKeys: ['history'],
      tourTypes: ['company'],
    });

    expect(queryBuilder.orderBy).toHaveBeenCalledWith('tour.sortOrder', 'ASC');
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

  it('returns lightweight admin tour summaries for listings', async () => {
    const { queryBuilder } = createListQueryBuilderMock([
      createTourEntity({
        id: 'tour-1',
        name: 'Historic Center Main Tour',
        sortOrder: 0,
        tourType: 'group',
        translations: [
          createTranslationEntity({
            languageCode: 'en',
            isReady: true,
            isPublished: true,
            bookingReferenceId: 'booking-ref-123',
          }),
          createTranslationEntity({
            languageCode: 'es',
            isReady: false,
            isPublished: false,
          }),
        ],
      }),
    ] as TourEntity[]);
    toursRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    const result = await service.findAll();

    expect(result).toEqual([
      {
        id: 'tour-1',
        name: 'Historic Center Main Tour',
        sortOrder: 0,
        tourType: 'group',
        translations: {
          en: {
            isReady: true,
            isPublished: true,
            slug: 'historic-center',
          },
          es: {
            isReady: false,
            isPublished: false,
            slug: 'historic-center',
          },
        },
        audit: {
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
          createdAt: new Date('2026-03-12T08:00:00.000Z'),
          updatedAt: new Date('2026-03-12T09:00:00.000Z'),
        },
      },
    ]);
  });

  it('accepts company as a valid tour type on creation', async () => {
    const persistedTour = createTourEntity({
      tourType: 'company',
      contentSchema: null,
      priceAmount: null,
      priceCurrency: null,
      rating: null,
      reviewCount: null,
      durationMinutes: null,
      startPoint: null,
      endPoint: null,
      itineraryVariant: null,
      tags: [],
      translations: [],
      mediaItems: [],
      coverMediaId: null,
    });

    toursRepository.findOne.mockResolvedValueOnce(persistedTour);
    toursRepository.manager.find.mockResolvedValue([]);
    toursRepository.manager.save.mockImplementation(async (_entity, value) => [
      {
        ...(value as TourEntity[])[0],
        id: 'tour-company-1',
      },
    ]);

    const result = await service.create(
      {
        name: 'Company Experience',
        tourType: 'company',
      },
      createAdmin(),
    );

    expect(toursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Company Experience',
        tourType: 'company',
        sortOrder: 0,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        tourType: 'company',
        sortOrder: 0,
      }),
    );
  });

  it('inserts a created tour at the requested sort order and shifts later tours', async () => {
    const persistedTour = createTourEntity({
      id: 'tour-3',
      name: 'New Tour',
      sortOrder: 1,
      contentSchema: null,
      priceAmount: null,
      priceCurrency: null,
      rating: null,
      reviewCount: null,
      durationMinutes: null,
      startPoint: null,
      endPoint: null,
      itineraryVariant: null,
      tags: [],
      translations: [],
      mediaItems: [],
      coverMediaId: null,
    });
    const existingTours = [
      createTourEntity({ id: 'tour-1', sortOrder: 0 }),
      createTourEntity({ id: 'tour-2', sortOrder: 1 }),
    ];

    toursRepository.findOne.mockResolvedValueOnce(persistedTour);
    toursRepository.manager.find.mockResolvedValue(existingTours);
    toursRepository.manager.save.mockImplementation(async (_entity, value) =>
      (value as TourEntity[]).map((tour) =>
        tour.name === 'New Tour'
          ? { ...tour, id: 'tour-3' }
          : tour,
      ),
    );

    await service.create(
      {
        name: 'New Tour',
        tourType: 'group',
        sortOrder: 1,
      },
      createAdmin(),
    );

    expect(toursRepository.manager.save).toHaveBeenCalledWith(
      TourEntity,
      expect.arrayContaining([
        expect.objectContaining({ id: 'tour-2', sortOrder: 2 }),
        expect.objectContaining({ name: 'New Tour', sortOrder: 1 }),
      ]),
    );
  });

  it('updates shared tour data and recalculates affected translations', async () => {
    const translation = createTranslationEntity({
      languageCode: 'en',
      isReady: true,
      isPublished: true,
      payload: {
        title: 'Historic Center',
        cancellationType: 'Free cancellation',
        highlights: ['Walls'],
        included: ['Guide'],
        notIncluded: ['Food'],
        startPoint: { label: 'Town Hall' },
        endPoint: { label: 'Cathedral' },
        itineraryDescription: 'Walk through the city.',
      },
    });
    const existingTour = createTourEntity({
      contentSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          cancellationType: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          included: { type: 'array', items: { type: 'string' } },
          notIncluded: { type: 'array', items: { type: 'string' } },
          startPoint: { type: 'object' },
          endPoint: { type: 'object' },
          itineraryDescription: { type: 'string' },
        },
        required: [
          'title',
          'cancellationType',
          'highlights',
          'included',
          'notIncluded',
          'startPoint',
          'endPoint',
          'itineraryDescription',
        ],
      },
      translations: [translation],
    });
    const refreshedTour = createTourEntity({
      contentSchema: existingTour.contentSchema,
      itineraryVariant: 'stops',
      stops: [
        createStopEntity({
          stopId: 'stop-1',
          orderIndex: 0,
          nextConnection: null,
        }),
      ],
      mediaItems: [],
      translations: [translation],
    });
    const responseTour = createTourEntity({
      contentSchema: refreshedTour.contentSchema,
      itineraryVariant: 'stops',
      stops: refreshedTour.stops,
      mediaItems: [],
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          isReady: false,
          isPublished: false,
          payload: translation.payload,
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(refreshedTour)
      .mockResolvedValueOnce(responseTour);

    await service.update(
      'tour-1',
      {
        itinerary: {
          variant: 'stops',
          stops: [{ id: 'stop-1' }],
        },
      },
      createAdmin(),
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          languageCode: 'en',
          isReady: false,
          isPublished: false,
        }),
      ]),
    );
  });

  it('accepts company as a valid tour type on shared updates', async () => {
    const existingTour = createTourEntity({
      tourType: 'company',
      contentSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          cancellationType: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          included: { type: 'array', items: { type: 'string' } },
          notIncluded: { type: 'array', items: { type: 'string' } },
          startPoint: { type: 'object' },
          endPoint: { type: 'object' },
          itineraryDescription: { type: 'string' },
        },
        required: [
          'title',
          'cancellationType',
          'highlights',
          'included',
          'notIncluded',
          'startPoint',
          'endPoint',
          'itineraryDescription',
        ],
      },
    });
    const responseTour = createTourEntity({
      tourType: 'company',
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(responseTour)
      .mockResolvedValueOnce(responseTour);
    toursRepository.save.mockImplementation(async (value) => value as TourEntity);
    stopsRepository.delete.mockResolvedValue({} as never);

    const result = await service.update(
      'tour-1',
      {
        tourType: 'company',
      },
      createAdmin(),
    );

    expect(toursRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tourType: 'company',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        tourType: 'company',
      }),
    );
  });

  it('moves a tour earlier when sortOrder is updated and shifts the displaced range', async () => {
    const existingTour = createTourEntity({
      id: 'tour-3',
      sortOrder: 2,
    });
    const orderedTours = [
      createTourEntity({ id: 'tour-1', sortOrder: 0 }),
      createTourEntity({ id: 'tour-2', sortOrder: 1 }),
      existingTour,
    ];
    const refreshedTour = createTourEntity({
      id: 'tour-3',
      sortOrder: 0,
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(refreshedTour)
      .mockResolvedValueOnce(refreshedTour);
    toursRepository.manager.find.mockResolvedValue(orderedTours);
    toursRepository.manager.save.mockImplementation(async (_entity, value) => value as TourEntity[]);
    stopsRepository.delete.mockResolvedValue({} as never);

    const result = await service.update(
      'tour-3',
      {
        sortOrder: 0,
      },
      createAdmin(),
    );

    expect(toursRepository.manager.save).toHaveBeenCalledWith(
      TourEntity,
      expect.arrayContaining([
        expect.objectContaining({ id: 'tour-1', sortOrder: 1 }),
        expect.objectContaining({ id: 'tour-2', sortOrder: 2 }),
        expect.objectContaining({ id: 'tour-3', sortOrder: 0 }),
      ]),
    );
    expect(result).toEqual(expect.objectContaining({ sortOrder: 0 }));
  });

  it('moves a tour to the end when sortOrder is updated past the current range', async () => {
    const existingTour = createTourEntity({
      id: 'tour-1',
      sortOrder: 0,
    });
    const orderedTours = [
      existingTour,
      createTourEntity({ id: 'tour-2', sortOrder: 1 }),
      createTourEntity({ id: 'tour-3', sortOrder: 2 }),
    ];
    const refreshedTour = createTourEntity({
      id: 'tour-1',
      sortOrder: 2,
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(refreshedTour)
      .mockResolvedValueOnce(refreshedTour);
    toursRepository.manager.find.mockResolvedValue(orderedTours);
    toursRepository.manager.save.mockImplementation(async (_entity, value) => value as TourEntity[]);
    stopsRepository.delete.mockResolvedValue({} as never);

    const result = await service.update(
      'tour-1',
      {
        sortOrder: 99,
      },
      createAdmin(),
    );

    expect(toursRepository.manager.save).toHaveBeenCalledWith(
      TourEntity,
      expect.arrayContaining([
        expect.objectContaining({ id: 'tour-1', sortOrder: 2 }),
        expect.objectContaining({ id: 'tour-2', sortOrder: 0 }),
        expect.objectContaining({ id: 'tour-3', sortOrder: 1 }),
      ]),
    );
    expect(result).toEqual(expect.objectContaining({ sortOrder: 2 }));
  });

  it('attaches media to a tour with localized alt text', async () => {
    const existingTour = createTourEntity({ mediaItems: [] });
    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(
        createTourEntity({
          mediaItems: [
            createTourMediaEntity({
              mediaId: 'media-1',
              orderIndex: 0,
              altText: { en: 'Historic center skyline' },
              media: createMediaAssetEntity(),
            }),
          ],
        }),
      );
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());

    await service.attachMedia(
      'tour-1',
      {
        mediaId: 'media-1',
        altText: { en: 'Historic center skyline' },
      },
      createAdmin(),
    );

    expect(tourMediaRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        mediaId: 'media-1',
        orderIndex: 0,
        altText: { en: 'Historic center skyline' },
      }),
    );
  });

  it('rejects assigning unattached media as the cover', async () => {
    toursRepository.findOne.mockResolvedValue(createTourEntity({ mediaItems: [] }));

    await expect(
      service.setCoverMedia(
        'tour-1',
        {
          mediaId: 'media-1',
        },
        createAdmin(),
      ),
    ).rejects.toThrow('Tour media "media-1" was not found for tour "tour-1".');
  });

  it('rejects a video asset as the cover media', async () => {
    toursRepository.findOne.mockResolvedValue(
      createTourEntity({
        mediaItems: [
          createTourMediaEntity({
            mediaId: 'media-2',
            media: createMediaAssetEntity({
              id: 'media-2',
              mediaType: 'video',
              contentType: 'video/mp4',
            }),
          }),
        ],
      }),
    );

    await expect(
      service.setCoverMedia(
        'tour-1',
        {
          mediaId: 'media-2',
        },
        createAdmin(),
      ),
    ).rejects.toThrow('Tour cover media must reference an image asset.');
  });

  it('creates a translation without a schema and stores it as not ready and unpublished', async () => {
    const existingTour = createTourEntity({
      contentSchema: null,
      translations: [],
    });
    const responseTour = createTourEntity({
      contentSchema: null,
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          isReady: false,
          isPublished: false,
          payload: { title: 'Historic Center' },
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(responseTour);
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );
    translationsRepository.findOne.mockResolvedValueOnce(null);

    await service.createTranslation(
      'tour-1',
      {
        languageCode: 'en',
        slug: 'historic-center',
        payload: { title: 'Historic Center' },
      },
      createAdmin(),
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        languageCode: 'en',
        slug: 'historic-center',
        isReady: false,
        isPublished: false,
      }),
    );
  });

  it('publishes a ready translation only through the dedicated endpoint', async () => {
    const existingTour = createTourEntity({
      contentSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          cancellationType: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          included: { type: 'array', items: { type: 'string' } },
          notIncluded: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'cancellationType', 'highlights', 'included', 'notIncluded'],
      },
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          isReady: false,
          isPublished: false,
          payload: {
            title: 'Historic Center',
            cancellationType: 'Free cancellation',
            highlights: ['Walls'],
            included: ['Guide'],
            notIncluded: ['Food'],
          },
        }),
      ],
    });
    const responseTour = createTourEntity({
      contentSchema: existingTour.contentSchema,
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          isReady: true,
          isPublished: true,
          payload: existingTour.translations[0].payload,
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(responseTour);
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );

    await service.publishTranslation(
      'tour-1',
      'en',
      { bookingReferenceId: 'booking-ref-123' },
      createAdmin(),
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: 'en',
        bookingReferenceId: 'booking-ref-123',
        isReady: true,
        isPublished: true,
      }),
    );
  });

  it('rejects duplicate translation creation for the same locale', async () => {
    const existingTour = createTourEntity({
      translations: [createTranslationEntity({ languageCode: 'en' })],
    });

    toursRepository.findOne.mockResolvedValue(existingTour);
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );

    await expect(
      service.createTranslation(
        'tour-1',
        {
          languageCode: 'en',
          slug: 'historic-center',
          payload: { title: 'Historic Center' },
        },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when deleting a translation that does not exist', async () => {
    toursRepository.findOne.mockResolvedValue(createTourEntity({ translations: [] }));

    await expect(
      service.deleteTranslation('tour-1', 'en', createAdmin()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createAdmin(): AuthenticatedAdmin {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    roleName: 'super_admin',
    status: 'active',
    auth0UserId: 'auth0|admin',
  };
}

function createTourEntity(overrides: Partial<TourEntity> = {}): TourEntity {
  return {
    id: 'tour-1',
    name: 'Historic Center Main Tour',
    sortOrder: 0,
    coverMediaId: null,
    coverMedia: null,
    mediaItems: [],
    contentSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        cancellationType: { type: 'string' },
        highlights: { type: 'array', items: { type: 'string' } },
        included: { type: 'array', items: { type: 'string' } },
        notIncluded: { type: 'array', items: { type: 'string' } },
        startPoint: { type: 'object' },
        endPoint: { type: 'object' },
        itineraryDescription: { type: 'string' },
      },
      required: [
        'title',
        'cancellationType',
        'highlights',
        'included',
        'notIncluded',
        'startPoint',
        'endPoint',
        'itineraryDescription',
      ],
    },
    priceAmount: '25.00',
    priceCurrency: 'EUR',
    rating: '4.80',
    reviewCount: 120,
    tourType: 'group',
    durationMinutes: 120,
    startPoint: { coordinates: { lat: 41.1, lng: 2.1 } },
    endPoint: { coordinates: { lat: 41.2, lng: 2.2 } },
    itineraryVariant: 'description',
    tags: [],
    stops: [],
    translations: [],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as TourEntity;
}

function createTranslationEntity(
  overrides: Partial<TourTranslationEntity> = {},
): TourTranslationEntity {
  return {
    id: 'translation-1',
    tourId: 'tour-1',
    languageCode: 'en',
    slug: 'historic-center',
    isReady: true,
    isPublished: false,
    bookingReferenceId: null,
    payload: {
      title: 'Historic Center',
      cancellationType: 'Free cancellation',
      highlights: ['Walls'],
      included: ['Guide'],
      notIncluded: ['Food'],
      startPoint: { label: 'Town Hall' },
      endPoint: { label: 'Cathedral' },
      itineraryDescription: 'Walk through the city.',
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

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'tours/historic-center/cover.jpg',
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
    tour: createTourEntity(),
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
