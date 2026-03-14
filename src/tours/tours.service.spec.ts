import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
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

  it('creates a minimal tour shell without translations or publish state', async () => {
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
    });

    toursRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedTour);
    toursRepository.save.mockImplementation(async (value) => ({
      id: 'tour-1',
      ...value,
    }));

    const result = await service.create(
      {
        name: 'Historic Center Main Tour',
        slug: 'historic-center',
        tourType: 'group',
      },
      createAdmin(),
    );

    expect(toursRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Historic Center Main Tour',
        slug: 'historic-center',
        tourType: 'group',
        contentSchema: null,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 'tour-1',
        name: 'Historic Center Main Tour',
        slug: 'historic-center',
        translations: {},
        translationAvailability: [],
      }),
    );
  });

  it('updates only shared tour data and recalculates affected translations', async () => {
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
      translations: [translation],
    });
    const responseTour = createTourEntity({
      contentSchema: refreshedTour.contentSchema,
      itineraryVariant: 'stops',
      stops: refreshedTour.stops,
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

    expect(stopsRepository.delete).toHaveBeenCalledWith({ tourId: 'tour-1' });
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

    await service.createTranslation(
      'tour-1',
      {
        languageCode: 'en',
        payload: { title: 'Historic Center' },
      },
      createAdmin(),
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        languageCode: 'en',
        isReady: false,
        isPublished: false,
      }),
    );
  });

  it('updates a translation and auto-unpublishes it when recalculated readiness becomes false', async () => {
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
          isReady: true,
          isPublished: true,
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
          isReady: false,
          isPublished: false,
          payload: {
            title: 'Historic Center',
            cancellationType: 'Free cancellation',
            highlights: ['Walls'],
            included: ['Guide'],
          },
        }),
      ],
    });

    toursRepository.findOne
      .mockResolvedValueOnce(existingTour)
      .mockResolvedValueOnce(responseTour);
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );

    await service.updateTranslation(
      'tour-1',
      'en',
      {
        payload: {
          title: 'Historic Center',
          cancellationType: 'Free cancellation',
          highlights: ['Walls'],
          included: ['Guide'],
        },
      },
      createAdmin(),
    );

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: 'en',
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

  it('rejects translation publication when the translation is not ready', async () => {
    const existingTour = createTourEntity({
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

    toursRepository.findOne.mockResolvedValue(existingTour);
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );

    await expect(
      service.publishTranslation('tour-1', 'en', {}, createAdmin()),
    ).rejects.toThrow('Translation "en" cannot be published until it is ready.');
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
          payload: { title: 'Historic Center' },
        },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unknown translation locales', async () => {
    toursRepository.findOne.mockResolvedValue(createTourEntity());
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTranslation(
        'tour-1',
        {
          languageCode: 'fr',
          payload: { title: 'Historic Center' },
        },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when updating a translation that does not exist', async () => {
    toursRepository.findOne.mockResolvedValue(createTourEntity({ translations: [] }));
    languagesRepository.findOne.mockResolvedValue(
      createLanguageEntity({ code: 'en' }),
    );

    await expect(
      service.updateTranslation(
        'tour-1',
        'en',
        { payload: { title: 'Historic Center' } },
        createAdmin(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a translation and touches the parent tour audit metadata', async () => {
    const existingTour = createTourEntity({
      translations: [
        createTranslationEntity({
          id: 'translation-en',
          languageCode: 'en',
        }),
      ],
    });

    toursRepository.findOne.mockResolvedValue(existingTour);

    await service.deleteTranslation('tour-1', 'en', createAdmin());

    expect(translationsRepository.delete).toHaveBeenCalledWith({
      id: 'translation-en',
    });
    expect(toursRepository.update).toHaveBeenCalledWith(
      { id: 'tour-1' },
      { updatedBy: 'admin-1' },
    );
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
    slug: 'historic-center',
    coverMediaRef: null,
    galleryMediaRefs: [],
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
