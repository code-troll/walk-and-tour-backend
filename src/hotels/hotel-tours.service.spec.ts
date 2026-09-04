import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TourEntity } from '../tours/entities/tour.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelToursService } from './hotel-tours.service';

describe('HotelToursService', () => {
  let service: HotelToursService;
  let grants: { findOne: jest.Mock };
  let tours: { findOne: jest.Mock };

  const buildTour = (overrides: Record<string, unknown> = {}) => ({
    id: 'tour-1',
    name: 'Historic Center',
    priceAmount: '250.00',
    priceCurrency: 'DKK',
    durationMinutes: 120,
    tourType: 'group',
    stops: [],
    translations: [
      {
        languageCode: 'en',
        isPublished: true,
        payload: {
          title: 'Historic Center Walk',
          aboutTourDescription: 'A walk through the old town.',
          highlights: ['Nyhavn', 'Amalienborg'],
          included: ['Guide'],
          notIncluded: ['Food'],
          itineraryDescription: 'Four stops, two hours.',
        },
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    grants = { findOne: jest.fn() };
    tours = { findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        HotelToursService,
        { provide: getRepositoryToken(HotelTourEntity), useValue: grants },
        { provide: getRepositoryToken(TourEntity), useValue: tours },
      ],
    }).compile();

    service = moduleRef.get(HotelToursService);
    grants.findOne.mockResolvedValue({ id: 'grant-1', priceAmount: null });
    tours.findOne.mockResolvedValue(buildTour());
  });

  it("answers 404, not 403, for a tour granted to another hotel", async () => {
    grants.findOne.mockResolvedValue(null);

    await expect(service.findGranted('hotel-1', 'tour-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // A 403 would confirm the tour exists. The tour is never even loaded.
    expect(tours.findOne).not.toHaveBeenCalled();
  });

  it('filters the grant by hotel and liveness in the query, not afterwards', async () => {
    await service.findGranted('hotel-1', 'tour-1');

    expect(grants.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ hotelId: 'hotel-1', tourId: 'tour-1' }),
      }),
    );
  });

  it('returns the content a partner needs to describe the tour', async () => {
    const view = await service.findGranted('hotel-1', 'tour-1');

    expect(view).toEqual(
      expect.objectContaining({
        name: 'Historic Center',
        about: 'A walk through the old town.',
        highlights: ['Nyhavn', 'Amalienborg'],
        included: ['Guide'],
        notIncluded: ['Food'],
        itineraryDescription: 'Four stops, two hours.',
        locale: 'en',
      }),
    );
  });

  it('prefers the grant price over the tour price', async () => {
    grants.findOne.mockResolvedValue({ id: 'grant-1', priceAmount: '99.00' });

    await expect(service.findGranted('hotel-1', 'tour-1')).resolves.toEqual(
      expect.objectContaining({ priceAmount: '99.00', currency: 'DKK' }),
    );
  });

  it('describes a tour that is not published to the public site', async () => {
    // The grant is the authorisation. A private tour a hotel may sell must
    // still be describable, which is why this does not reuse the public model.
    tours.findOne.mockResolvedValue(
      buildTour({
        translations: [
          {
            languageCode: 'en',
            isPublished: false,
            payload: { aboutTourDescription: 'Private walk.' },
          },
        ],
      }),
    );

    await expect(service.findGranted('hotel-1', 'tour-1')).resolves.toEqual(
      expect.objectContaining({ about: 'Private walk.', locale: 'en' }),
    );
  });

  it('falls back to another locale and says which one', async () => {
    tours.findOne.mockResolvedValue(
      buildTour({
        translations: [
          {
            languageCode: 'it',
            isPublished: true,
            payload: { aboutTourDescription: 'Una passeggiata.' },
          },
        ],
      }),
    );

    await expect(service.findGranted('hotel-1', 'tour-1')).resolves.toEqual(
      expect.objectContaining({ about: 'Una passeggiata.', locale: 'it' }),
    );
  });

  it('survives a tour with no translations at all', async () => {
    tours.findOne.mockResolvedValue(buildTour({ translations: [] }));

    await expect(service.findGranted('hotel-1', 'tour-1')).resolves.toEqual(
      expect.objectContaining({
        about: null,
        locale: null,
        highlights: [],
        included: [],
        notIncluded: [],
      }),
    );
  });

  it('orders stops and localizes them', async () => {
    tours.findOne.mockResolvedValue(
      buildTour({
        stops: [
          { stopId: 'b', orderIndex: 2, durationMinutes: 20 },
          { stopId: 'a', orderIndex: 1, durationMinutes: 10 },
        ],
        translations: [
          {
            languageCode: 'en',
            isPublished: true,
            payload: {
              itineraryStops: {
                a: { title: 'First', description: 'Start here.' },
                b: { title: 'Second' },
              },
            },
          },
        ],
      }),
    );

    const view = await service.findGranted('hotel-1', 'tour-1');

    expect(view.stops).toEqual([
      { stopId: 'a', title: 'First', description: 'Start here.', durationMinutes: 10 },
      { stopId: 'b', title: 'Second', description: null, durationMinutes: 20 },
    ]);
  });

  it('ignores a payload whose lists are not lists', async () => {
    tours.findOne.mockResolvedValue(
      buildTour({
        translations: [
          {
            languageCode: 'en',
            isPublished: true,
            payload: { included: 'Guide', highlights: [1, 'Nyhavn'] },
          },
        ],
      }),
    );

    const view = await service.findGranted('hotel-1', 'tour-1');

    expect(view.included).toEqual([]);
    expect(view.highlights).toEqual(['Nyhavn']);
  });
});
