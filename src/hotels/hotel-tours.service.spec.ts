import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TourEntity } from '../tours/entities/tour.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelToursService } from './hotel-tours.service';

describe('HotelToursService', () => {
  let service: HotelToursService;
  let grants: { findOne: jest.Mock; find: jest.Mock };
  let tours: { findOne: jest.Mock; find: jest.Mock };

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
    grants = { findOne: jest.fn(), find: jest.fn() };
    tours = { findOne: jest.fn(), find: jest.fn() };

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

  describe('listGranted', () => {
    it('returns nothing, and asks for no tours, when the hotel has no grants', async () => {
      grants.find.mockResolvedValue([]);

      await expect(service.listGranted('hotel-1')).resolves.toEqual([]);
      expect(tours.find).not.toHaveBeenCalled();
    });

    it('applies each grant\'s own price to its own tour', async () => {
      grants.find.mockResolvedValue([
        { tourId: 'tour-1', priceAmount: '99.00' },
        { tourId: 'tour-2', priceAmount: null },
      ]);
      tours.find.mockResolvedValue([
        buildTour({ id: 'tour-2', priceAmount: '250.00' }),
        buildTour({ id: 'tour-1', priceAmount: '250.00' }),
      ]);

      const views = await service.listGranted('hotel-1');

      // Grant order, not the order the database happened to return the tours in.
      expect(views.map((view) => [view.tourId, view.priceAmount])).toEqual([
        ['tour-1', '99.00'],
        ['tour-2', '250.00'],
      ]);
    });

    it('drops a grant whose tour has gone missing rather than failing the list', async () => {
      grants.find.mockResolvedValue([
        { tourId: 'tour-1', priceAmount: null },
        { tourId: 'tour-gone', priceAmount: null },
      ]);
      tours.find.mockResolvedValue([buildTour()]);

      await expect(service.listGranted('hotel-1')).resolves.toHaveLength(1);
    });

    it('carries what the portal searches on', async () => {
      grants.find.mockResolvedValue([{ tourId: 'tour-1', priceAmount: null }]);
      tours.find.mockResolvedValue([
        buildTour({
          tags: [
            { key: 'history', labels: { en: 'History', it: 'Storia' } },
            { key: 'family', labels: {} },
          ],
          stops: [{ stopId: 'a', orderIndex: 1, durationMinutes: 10 }],
          translations: [
            {
              languageCode: 'en',
              isPublished: true,
              payload: {
                highlights: ['Nyhavn'],
                startPoint: { label: 'Kongens Nytorv' },
                endPoint: { label: 'Amalienborg' },
                itineraryStops: { a: { title: 'The old harbour' } },
              },
            },
          ],
        }),
      ]);

      const [view] = await service.listGranted('hotel-1');

      expect(view.tags).toEqual(['History', 'family']); // no label falls back to the key
      expect(view.startPoint).toBe('Kongens Nytorv');
      expect(view.endPoint).toBe('Amalienborg');
      expect(view.stops[0].title).toBe('The old harbour');
      expect(view.highlights).toEqual(['Nyhavn']);
    });

    it('labels tags in the content locale when it is not English', async () => {
      grants.find.mockResolvedValue([{ tourId: 'tour-1', priceAmount: null }]);
      tours.find.mockResolvedValue([
        buildTour({
          tags: [{ key: 'history', labels: { en: 'History', it: 'Storia' } }],
          translations: [
            { languageCode: 'it', isPublished: true, payload: {} },
          ],
        }),
      ]);

      const [view] = await service.listGranted('hotel-1');

      expect(view.tags).toEqual(['Storia']);
      expect(view.locale).toBe('it');
    });
  });
});
