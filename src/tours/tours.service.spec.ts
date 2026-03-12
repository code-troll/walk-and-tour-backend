import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';
import { ToursService } from './tours.service';

describe('ToursService', () => {
  let service: ToursService;
  let toursRepository: RepositoryMock<TourEntity>;
  let stopsRepository: RepositoryMock<TourItineraryStopEntity>;
  let translationsRepository: RepositoryMock<TourTranslationEntity>;
  let tagsRepository: RepositoryMock<TagEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let schemaPolicyService: jest.Mocked<TourSchemaPolicyService>;
  let payloadValidationService: jest.Mocked<TourPayloadValidationService>;

  beforeEach(() => {
    toursRepository = createRepositoryMock<TourEntity>();
    stopsRepository = createRepositoryMock<TourItineraryStopEntity>();
    translationsRepository = createRepositoryMock<TourTranslationEntity>();
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
      tagsRepository as never,
      languagesRepository as never,
      schemaPolicyService,
      payloadValidationService,
    );
  });

  it('creates a stop-based published tour with localized stops and returns the admin response shape', async () => {
    const persistedTour = createTourEntity({
      itineraryVariant: 'stops',
      stops: [
        createStopEntity({
          stopId: 'stop-1',
          orderIndex: 0,
          durationMinutes: 10,
          coordinates: { lat: 41.1, lng: 2.1 },
          nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
        }),
        createStopEntity({
          stopId: 'stop-2',
          orderIndex: 1,
          durationMinutes: 20,
          coordinates: { lat: 41.2, lng: 2.2 },
          nextConnection: null,
        }),
      ],
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          payload: {
            title: 'Historic Center',
            startPoint: { label: 'Town Hall' },
            endPoint: { label: 'Cathedral' },
            itineraryStops: {
              'stop-1': {
                title: 'City Hall',
                description: 'Meet at the main square.',
              },
              'stop-2': {
                title: 'Cathedral',
                description: 'Finish at the cathedral.',
              },
            },
          },
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedTour);
    toursRepository.create.mockImplementation((value) => value);
    toursRepository.save.mockImplementation(async (value) => ({
      id: 'tour-1',
      ...value,
    }));
    tagsRepository.findBy.mockResolvedValue([
      createTagEntity({ key: 'history', labels: { en: 'History' } }),
    ] as TagEntity[]);
    languagesRepository.findBy.mockResolvedValue([
      createLanguageEntity({ code: 'en' }),
    ] as LanguageEntity[]);

    const result = await service.create(
      {
        slug: 'historic-center',
        publicationStatus: 'published',
        isHidden: false,
        contentSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            startPoint: { type: 'object' },
            endPoint: { type: 'object' },
            itineraryStops: { type: 'object' },
          },
          required: ['title', 'startPoint', 'endPoint', 'itineraryStops'],
        },
        price: {
          amount: 25,
          currency: 'EUR',
        },
        rating: 4.8,
        reviewCount: 100,
        tourType: 'group',
        cancellationType: '24h_free_cancellation',
        durationMinutes: 120,
        startPoint: { coordinates: { lat: 41.1, lng: 2.1 } },
        endPoint: { coordinates: { lat: 41.2, lng: 2.2 } },
        itinerary: {
          variant: 'stops',
          stops: [
            {
              id: 'stop-1',
              durationMinutes: 10,
              coordinates: { lat: 41.1, lng: 2.1 },
              nextConnection: {
                commuteMode: 'walk',
                durationMinutes: 5,
              },
            },
            {
              id: 'stop-2',
              durationMinutes: 20,
              coordinates: { lat: 41.2, lng: 2.2 },
            },
          ],
        },
        tagKeys: ['history'],
        translations: [
          {
            languageCode: 'en',
            translationStatus: 'ready',
            publicationStatus: 'published',
            isHidden: false,
            payload: {
              title: 'Historic Center',
              startPoint: { label: 'Town Hall' },
              endPoint: { label: 'Cathedral' },
              itineraryStops: {
                'stop-1': {
                  title: 'City Hall',
                  description: 'Meet at the main square.',
                },
                'stop-2': {
                  title: 'Cathedral',
                  description: 'Finish at the cathedral.',
                },
              },
            },
          },
        ],
      },
      createAdmin(),
    );

    expect(stopsRepository.delete).toHaveBeenCalledWith({ tourId: 'tour-1' });
    expect(stopsRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tourId: 'tour-1',
        stopId: 'stop-1',
        orderIndex: 0,
        durationMinutes: 10,
        coordinates: { lat: 41.1, lng: 2.1 },
        nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
      }),
      expect.objectContaining({
        tourId: 'tour-1',
        stopId: 'stop-2',
        orderIndex: 1,
        durationMinutes: 20,
        coordinates: { lat: 41.2, lng: 2.2 },
        nextConnection: null,
      }),
    ]);
    expect(translationsRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tourId: 'tour-1',
        languageCode: 'en',
        translationStatus: 'ready',
        publicationStatus: 'published',
        payload: expect.objectContaining({
          itineraryStops: expect.objectContaining({
            'stop-1': expect.objectContaining({
              description: 'Meet at the main square.',
            }),
          }),
        }),
      }),
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-1',
        slug: 'historic-center',
        price: {
          amount: 25,
          currency: 'EUR',
        },
        itinerary: {
          variant: 'stops',
          stops: [
            expect.objectContaining({
              id: 'stop-1',
              durationMinutes: 10,
              coordinates: { lat: 41.1, lng: 2.1 },
              nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
            }),
            expect.objectContaining({
              id: 'stop-2',
              durationMinutes: 20,
              coordinates: { lat: 41.2, lng: 2.2 },
              nextConnection: null,
            }),
          ],
        },
        translations: {
          en: expect.objectContaining({
            translationStatus: 'ready',
            publicationStatus: 'published',
            payload: expect.objectContaining({
              itineraryStops: expect.objectContaining({
                'stop-2': expect.objectContaining({
                  title: 'Cathedral',
                }),
              }),
            }),
          }),
        },
        translationAvailability: [
          expect.objectContaining({
            languageCode: 'en',
            missingStopTranslations: [],
            isSchemaValid: true,
            publiclyAvailable: true,
          }),
        ],
      }),
    );
  });

  it('updates stop-based itinerary by removing, editing, and adding stops and localized descriptions', async () => {
    const existingTranslation = createTranslationEntity({
      id: 'translation-en',
      languageCode: 'en',
      payload: {
        title: 'Historic Center',
        itineraryStops: {
          'stop-1': {
            title: 'City Hall',
            description: 'Meet at the main square.',
          },
          'stop-2': {
            title: 'Cathedral',
            description: 'Old cathedral description.',
          },
        },
      },
    });

    const existingTour = createTourEntity({
      publicationStatus: 'draft',
      publishedAt: null,
      publishedBy: null,
      itineraryVariant: 'stops',
      stops: [
        createStopEntity({
          stopId: 'stop-1',
          orderIndex: 0,
          durationMinutes: 10,
          coordinates: { lat: 41.1, lng: 2.1 },
          nextConnection: { commuteMode: 'walk', durationMinutes: 5 },
        }),
        createStopEntity({
          stopId: 'stop-2',
          orderIndex: 1,
          durationMinutes: 15,
          coordinates: { lat: 41.2, lng: 2.2 },
          nextConnection: null,
        }),
      ],
      translations: [existingTranslation],
    });

    const updatedTour = createTourEntity({
      publicationStatus: 'published',
      updatedBy: 'admin-1',
      publishedBy: 'admin-1',
      itineraryVariant: 'stops',
      stops: [
        createStopEntity({
          stopId: 'stop-2',
          orderIndex: 0,
          durationMinutes: 25,
          coordinates: { lat: 41.22, lng: 2.22 },
          nextConnection: { commuteMode: 'metro', durationMinutes: 8 },
        }),
        createStopEntity({
          stopId: 'stop-3',
          orderIndex: 1,
          durationMinutes: 30,
          coordinates: { lat: 41.3, lng: 2.3 },
          nextConnection: null,
        }),
      ],
      translations: [
        createTranslationEntity({
          id: 'translation-en',
          languageCode: 'en',
          payload: {
            title: 'Historic Center',
            itineraryStops: {
              'stop-2': {
                title: 'Cathedral',
                description: 'Updated cathedral description.',
              },
              'stop-3': {
                title: 'Roman Wall',
                description: 'Newly added stop.',
              },
            },
          },
        }),
        createTranslationEntity({
          id: 'translation-es',
          languageCode: 'es',
          payload: {
            title: 'Centro Historico',
            itineraryStops: {
              'stop-2': {
                title: 'Catedral',
                description: 'Descripcion actualizada.',
              },
              'stop-3': {
                title: 'Muralla Romana',
                description: 'Nueva parada.',
              },
            },
          },
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(updatedTour);
    toursRepository.save.mockImplementation(async (value) => value);
    tagsRepository.findBy.mockResolvedValue([
      createTagEntity({ key: 'history', labels: { en: 'History', es: 'Historia' } }),
    ] as TagEntity[]);
    languagesRepository.findBy.mockResolvedValue([
      createLanguageEntity({ code: 'en' }),
      createLanguageEntity({ code: 'es' }),
    ] as LanguageEntity[]);

    const result = await service.update(
      'tour-1',
      {
        publicationStatus: 'published',
        itinerary: {
          variant: 'stops',
          stops: [
            {
              id: 'stop-2',
              durationMinutes: 25,
              coordinates: { lat: 41.22, lng: 2.22 },
              nextConnection: {
                commuteMode: 'metro',
                durationMinutes: 8,
              },
            },
            {
              id: 'stop-3',
              durationMinutes: 30,
              coordinates: { lat: 41.3, lng: 2.3 },
            },
          ],
        },
        translations: [
          {
            languageCode: 'en',
            translationStatus: 'ready',
            publicationStatus: 'published',
            isHidden: false,
            payload: {
              title: 'Historic Center',
              itineraryStops: {
                'stop-2': {
                  title: 'Cathedral',
                  description: 'Updated cathedral description.',
                },
                'stop-3': {
                  title: 'Roman Wall',
                  description: 'Newly added stop.',
                },
              },
            },
          },
          {
            languageCode: 'es',
            translationStatus: 'ready',
            publicationStatus: 'published',
            isHidden: false,
            payload: {
              title: 'Centro Historico',
              itineraryStops: {
                'stop-2': {
                  title: 'Catedral',
                  description: 'Descripcion actualizada.',
                },
                'stop-3': {
                  title: 'Muralla Romana',
                  description: 'Nueva parada.',
                },
              },
            },
          },
        ],
      },
      createAdmin(),
    );

    expect(stopsRepository.delete).toHaveBeenCalledWith({ tourId: 'tour-1' });
    expect(stopsRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        tourId: 'tour-1',
        stopId: 'stop-2',
        orderIndex: 0,
        durationMinutes: 25,
        coordinates: { lat: 41.22, lng: 2.22 },
        nextConnection: { commuteMode: 'metro', durationMinutes: 8 },
      }),
      expect.objectContaining({
        tourId: 'tour-1',
        stopId: 'stop-3',
        orderIndex: 1,
        durationMinutes: 30,
        coordinates: { lat: 41.3, lng: 2.3 },
        nextConnection: null,
      }),
    ]);
    expect(translationsRepository.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'translation-en',
        languageCode: 'en',
        payload: expect.objectContaining({
          itineraryStops: {
            'stop-2': {
              title: 'Cathedral',
              description: 'Updated cathedral description.',
            },
            'stop-3': {
              title: 'Roman Wall',
              description: 'Newly added stop.',
            },
          },
        }),
      }),
    );
    expect(translationsRepository.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tourId: 'tour-1',
        languageCode: 'es',
        translationStatus: 'ready',
        publicationStatus: 'published',
        payload: expect.objectContaining({
          itineraryStops: expect.objectContaining({
            'stop-3': expect.objectContaining({
              description: 'Nueva parada.',
            }),
          }),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        slug: 'historic-center',
        itinerary: {
          variant: 'stops',
          stops: [
            expect.objectContaining({
              id: 'stop-2',
              durationMinutes: 25,
            }),
            expect.objectContaining({
              id: 'stop-3',
              durationMinutes: 30,
            }),
          ],
        },
        translations: {
          en: expect.objectContaining({
            payload: expect.objectContaining({
              itineraryStops: expect.not.objectContaining({
                'stop-1': expect.anything(),
              }),
            }),
          }),
          es: expect.objectContaining({
            payload: expect.objectContaining({
              itineraryStops: expect.objectContaining({
                'stop-2': expect.objectContaining({
                  title: 'Catedral',
                }),
              }),
            }),
          }),
        },
        translationAvailability: expect.arrayContaining([
          expect.objectContaining({
            languageCode: 'en',
            publiclyAvailable: true,
          }),
          expect.objectContaining({
            languageCode: 'es',
            publiclyAvailable: true,
          }),
        ]),
        audit: expect.objectContaining({
          updatedBy: 'admin-1',
          publishedBy: 'admin-1',
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('returns admin list and detail responses with normalized scalar and translation data', async () => {
    const tour = createTourEntity({
      itineraryVariant: 'description',
      translations: [
        createTranslationEntity({
          languageCode: 'en',
          payload: {
            title: 'Historic Center',
            itineraryDescription: 'Walk through the old city.',
          },
        }),
        createTranslationEntity({
          languageCode: 'es',
          translationStatus: 'draft',
          publicationStatus: 'draft',
          payload: {
            title: 'Centro Historico',
          },
        }),
      ],
    });

    toursRepository.find.mockResolvedValue([tour]);
    toursRepository.findOne.mockResolvedValue(tour);

    const list = await service.findAll();
    const detail = await service.findOne('tour-1');

    expect(list).toEqual([
      expect.objectContaining({
        id: 'tour-1',
        rating: 4.8,
        price: {
          amount: 25,
          currency: 'EUR',
        },
        itinerary: {
          variant: 'description',
          stops: [],
        },
        tags: [
          {
            key: 'history',
            labels: { en: 'History' },
          },
        ],
        translations: {
          en: expect.objectContaining({
            payload: expect.objectContaining({
              itineraryDescription: 'Walk through the old city.',
            }),
          }),
          es: expect.objectContaining({
            translationStatus: 'draft',
            publicationStatus: 'draft',
          }),
        },
      }),
    ]);
    expect(detail).toEqual(
      expect.objectContaining({
        id: 'tour-1',
        startPoint: {},
        endPoint: {},
        translationAvailability: expect.arrayContaining([
          expect.objectContaining({
            languageCode: 'en',
            isSchemaValid: true,
          }),
          expect.objectContaining({
            languageCode: 'es',
            isSchemaValid: true,
            publiclyAvailable: false,
          }),
        ]),
        audit: expect.objectContaining({
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
          publishedBy: 'admin-1',
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('rejects tip-based tours that define a fixed price', async () => {
    toursRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          slug: 'tip-tour',
          publicationStatus: 'draft',
          isHidden: false,
          contentSchema: { type: 'object' },
          price: {
            amount: 20,
            currency: 'EUR',
          },
          rating: 4.5,
          reviewCount: 10,
          tourType: 'tip_based',
          cancellationType: '24h_free_cancellation',
          durationMinutes: 90,
          startPoint: {},
          endPoint: {},
          itinerary: {
            variant: 'description',
          },
          tagKeys: [],
        },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate tour slugs on update', async () => {
    toursRepository.findOne
      .mockResolvedValueOnce(createTourEntity())
      .mockResolvedValueOnce({ id: 'tour-2', slug: 'duplicate' } as TourEntity);

    await expect(
      service.update(
        'tour-1',
        { slug: 'duplicate' },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

function createAdmin(): AuthenticatedAdmin {
  return {
    id: 'admin-1',
    email: 'admin@example.com',
    roleName: 'editor',
    status: 'active',
    auth0UserId: 'auth0|123',
  };
}

function createTourEntity(overrides: Partial<TourEntity> = {}): TourEntity {
  return {
    id: 'tour-1',
    slug: 'historic-center',
    category: 'walking',
    coverMediaRef: null,
    galleryMediaRefs: [],
    publicationStatus: 'published',
    isHidden: false,
    contentSchema: { type: 'object' },
    priceAmount: '25.00',
    priceCurrency: 'EUR',
    rating: '4.8',
    reviewCount: 100,
    tourType: 'group',
    cancellationType: '24h_free_cancellation',
    durationMinutes: 120,
    startPoint: {},
    endPoint: {},
    itineraryVariant: 'description',
    tags: [
      createTagEntity({
        key: 'history',
        labels: { en: 'History' },
      }),
    ],
    stops: [],
    translations: [
      createTranslationEntity({
        languageCode: 'en',
        payload: {
          title: 'Historic Center',
          startPoint: { label: 'Town Hall' },
          endPoint: { label: 'Canal' },
          itineraryDescription: 'Walk through the center.',
        },
      }),
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    publishedBy: 'admin-1',
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    publishedAt: new Date('2026-03-12T10:00:00.000Z'),
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
    translationStatus: 'ready',
    publicationStatus: 'published',
    isHidden: false,
    bookingReferenceId: null,
    payload: {
      title: 'Historic Center',
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

function createTagEntity(overrides: Partial<TagEntity> = {}): TagEntity {
  return {
    key: 'history',
    labels: { en: 'History' },
    createdAt: new Date('2026-03-12T08:00:00.000Z'),
    updatedAt: new Date('2026-03-12T09:00:00.000Z'),
    ...overrides,
  } as TagEntity;
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
