import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { EventDayNoteEntity } from './entities/event-day-note.entity';
import { EventOccurrenceEntity } from './entities/event-occurrence.entity';
import { EventEntity } from './entities/event.entity';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: RepositoryMock<EventEntity>;
  let occurrencesRepository: RepositoryMock<EventOccurrenceEntity>;
  let toursRepository: RepositoryMock<TourEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let dayNotesRepository: RepositoryMock<EventDayNoteEntity>;
  let teamMembersService: { assertMembersAvailable: jest.Mock };

  const actor = {
    id: 'admin-1',
    email: 'admin@example.com',
    roleName: 'editor' as const,
    status: 'active' as const,
    auth0UserId: 'auth0|123',
  };

  beforeEach(() => {
    eventsRepository = createRepositoryMock<EventEntity>();
    occurrencesRepository = createRepositoryMock<EventOccurrenceEntity>();
    toursRepository = createRepositoryMock<TourEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    dayNotesRepository = createRepositoryMock<EventDayNoteEntity>();
    teamMembersService = { assertMembersAvailable: jest.fn().mockResolvedValue(undefined) };
    service = new EventsService(
      eventsRepository as never,
      occurrencesRepository as never,
      toursRepository as never,
      languagesRepository as never,
      dayNotesRepository as never,
      teamMembersService as never,
    );
  });

  // ── create ─────────────────────────────────────────────────────

  it('creates a single event', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' });
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.save.mockImplementation(async (value) => ({
      id: 'event-new',
      ...value,
    }));
    eventsRepository.findOne.mockResolvedValue(createEventEntity({ id: 'event-new' }));

    await service.create(
      {
        language: 'en',
        type: 'free',
        durationMinutes: 90,
        frequency: 'single',
        startDate: '2026-07-01T10:00:00.000Z',
      },
      actor,
    );

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        language: 'en',
        type: 'free',
        frequency: 'single',
        durationMinutes: 90,
        status: 'active',
        recurrenceFreq: null,
        createdBy: 'admin-1',
      }),
    );
  });

  it('creates a recurring event with a recurrence rule', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' });
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.save.mockImplementation(async (value) => ({
      id: 'event-new',
      ...value,
    }));
    eventsRepository.findOne.mockResolvedValue(createEventEntity({ id: 'event-new' }));

    await service.create(
      {
        language: 'en',
        type: 'paid',
        durationMinutes: 60,
        frequency: 'recurring',
        startDate: '2026-07-01T10:00:00.000Z',
        recurrence: {
          freq: 'weekly',
          interval: 1,
          byDay: [1, 3],
          until: '2026-12-31T00:00:00.000Z',
        },
      },
      actor,
    );

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 'recurring',
        recurrenceFreq: 'weekly',
        recurrenceInterval: 1,
        recurrenceByDay: [1, 3],
      }),
    );
  });

  it('creates an open-ended recurring event without an end date', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' });
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.save.mockImplementation(async (value) => ({
      id: 'event-new',
      ...value,
    }));
    eventsRepository.findOne.mockResolvedValue(createEventEntity({ id: 'event-new' }));

    await service.create(
      {
        language: 'en',
        type: 'free',
        durationMinutes: 60,
        frequency: 'recurring',
        startDate: '2026-07-01T10:00:00.000Z',
        recurrence: {
          freq: 'weekly',
          interval: 1,
          byDay: [1],
        },
      },
      actor,
    );

    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        frequency: 'recurring',
        recurrenceFreq: 'weekly',
        recurrenceUntil: null,
      }),
    );
  });

  it('rejects creation with an unknown language', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          language: 'fr',
          type: 'free',
          durationMinutes: 90,
          frequency: 'single',
          startDate: '2026-07-01T10:00:00.000Z',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects creation with an unknown tour', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' });
    toursRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          language: 'en',
          type: 'free',
          tourId: 'missing-tour',
          durationMinutes: 90,
          frequency: 'single',
          startDate: '2026-07-01T10:00:00.000Z',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── findOne / cancel / remove ──────────────────────────────────

  it('throws NotFoundException for a missing event', async () => {
    eventsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cancels an event', async () => {
    eventsRepository.findOne.mockResolvedValue(createEventEntity());

    await service.cancel('event-1', actor);

    expect(eventsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled', updatedBy: 'admin-1' }),
    );
  });

  it('removes an event', async () => {
    const event = createEventEntity();
    eventsRepository.findOne.mockResolvedValue(event);

    await service.remove('event-1');

    expect(eventsRepository.remove).toHaveBeenCalledWith(event);
  });

  // ── listOccurrences ────────────────────────────────────────────

  it('merges candidate dates with stored occurrences', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({
        frequency: 'recurring',
        recurrenceFreq: 'daily',
        recurrenceInterval: 1,
        recurrenceByDay: null,
        recurrenceUntil: new Date('2026-12-31T00:00:00.000Z'),
      }),
    );
    occurrencesRepository.find.mockResolvedValue([
      createOccurrenceEntity({
        id: 'occ-2',
        occurrenceDate: new Date('2026-07-02T10:00:00.000Z'),
        teamMembers: [{ id: 'm1' } as never],
      }),
    ]);

    const result = (await service.listOccurrences(
      'event-1',
      '2026-07-01T00:00:00.000Z',
      '2026-07-03T23:59:59.000Z',
    )) as Array<Record<string, unknown>>;

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      date: '2026-07-01T10:00:00.000Z',
      status: 'unconfirmed',
    });
    expect(result[1]).toEqual({
      date: '2026-07-02T10:00:00.000Z',
      status: 'confirmed',
      occurrenceId: 'occ-2',
      note: null,
      teamMemberIds: ['m1'],
    });
    expect(result[2]).toMatchObject({ status: 'unconfirmed' });
  });

  it('defaults the timezone and rejects an unknown one on create', async () => {
    languagesRepository.findOne.mockResolvedValue({ code: 'en' });
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.save.mockImplementation(async (value) => ({
      id: 'event-new',
      ...value,
    }));
    eventsRepository.findOne.mockResolvedValue(createEventEntity({ id: 'event-new' }));

    await service.create(
      {
        language: 'en',
        type: 'free',
        durationMinutes: 90,
        frequency: 'single',
        startDate: '2026-07-01T10:00:00.000Z',
      },
      actor,
    );
    expect(eventsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: 'Europe/Copenhagen' }),
    );

    await expect(
      service.create(
        {
          language: 'en',
          type: 'free',
          durationMinutes: 90,
          frequency: 'single',
          startDate: '2026-07-01T10:00:00.000Z',
          timezone: 'Mars/Phobos',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── listCalendar ───────────────────────────────────────────────

  it('merges occurrences across events with event context', async () => {
    eventsRepository.find.mockResolvedValue([
      createEventEntity({
        id: 'daily-event',
        frequency: 'recurring',
        recurrenceFreq: 'daily',
        recurrenceInterval: 1,
        recurrenceUntil: new Date('2026-12-31T00:00:00.000Z'),
        occurrences: [
          createOccurrenceEntity({
            id: 'occ-a',
            eventId: 'daily-event',
            occurrenceDate: new Date('2026-07-02T10:00:00.000Z'),
          }),
        ],
      }),
      createEventEntity({
        id: 'cancelled-event',
        status: 'cancelled',
        occurrences: [
          createOccurrenceEntity({
            id: 'occ-b',
            eventId: 'cancelled-event',
            occurrenceDate: new Date('2026-07-01T10:00:00.000Z'),
            status: 'cancelled',
          }),
        ],
      }),
    ]);

    const result = (await service.listCalendar(
      '2026-07-01T00:00:00.000Z',
      '2026-07-02T23:59:59.000Z',
    )) as Array<Record<string, unknown>>;

    // daily-event: candidates for 07-01 (unconfirmed) + 07-02 (confirmed).
    // cancelled-event: only its stored occurrence, no ghost candidate.
    expect(result).toHaveLength(3);
    for (const item of result) {
      expect(item).toHaveProperty('eventId');
      expect(item).toHaveProperty('event');
    }
    const cancelledItems = result.filter((item) => item.eventId === 'cancelled-event');
    expect(cancelledItems).toHaveLength(1);
    expect(cancelledItems[0]).toMatchObject({ status: 'cancelled' });
    const dailyItems = result.filter((item) => item.eventId === 'daily-event');
    expect(dailyItems.map((item) => item.status)).toEqual(
      expect.arrayContaining(['unconfirmed', 'confirmed']),
    );
  });

  // ── confirmOccurrence ──────────────────────────────────────────

  it('confirms a matching occurrence and enforces availability', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ startDate: new Date('2026-07-01T10:00:00.000Z') }),
    );
    occurrencesRepository.findOne
      .mockResolvedValueOnce(null) // duplicate check
      .mockResolvedValueOnce(
        createOccurrenceEntity({ id: 'occ-new', teamMembers: [{ id: 'm1' } as never] }),
      );
    occurrencesRepository.create.mockImplementation((value) => value);
    occurrencesRepository.save.mockImplementation(async (value) => ({
      id: 'occ-new',
      ...value,
    }));

    await service.confirmOccurrence(
      'event-1',
      { date: '2026-07-01T10:00:00.000Z', teamMemberIds: ['m1'], note: 'Meet at plaza' },
      actor,
    );

    expect(teamMembersService.assertMembersAvailable).toHaveBeenCalledWith(
      expect.any(Date),
      90,
      ['m1'],
    );
    expect(occurrencesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        status: 'confirmed',
        note: 'Meet at plaza',
        teamMembers: [{ id: 'm1' }],
      }),
    );
  });

  it('rejects confirming a date that is not on the schedule', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ startDate: new Date('2026-07-01T10:00:00.000Z') }),
    );

    await expect(
      service.confirmOccurrence(
        'event-1',
        { date: '2026-07-02T10:00:00.000Z' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects confirming a date twice', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ startDate: new Date('2026-07-01T10:00:00.000Z') }),
    );
    occurrencesRepository.findOne.mockResolvedValue(createOccurrenceEntity());

    await expect(
      service.confirmOccurrence(
        'event-1',
        { date: '2026-07-01T10:00:00.000Z' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects confirming an occurrence on a cancelled event', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ status: 'cancelled' }),
    );

    await expect(
      service.confirmOccurrence(
        'event-1',
        { date: '2026-07-01T10:00:00.000Z' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propagates availability conflicts when confirming', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ startDate: new Date('2026-07-01T10:00:00.000Z') }),
    );
    occurrencesRepository.findOne.mockResolvedValueOnce(null);
    teamMembersService.assertMembersAvailable.mockRejectedValueOnce(
      new BadRequestException('unavailable'),
    );

    await expect(
      service.confirmOccurrence(
        'event-1',
        { date: '2026-07-01T10:00:00.000Z', teamMemberIds: ['m1'] },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(occurrencesRepository.create).not.toHaveBeenCalled();
  });

  it('creates a cancelled occurrence without checking availability', async () => {
    eventsRepository.findOne.mockResolvedValue(
      createEventEntity({ startDate: new Date('2026-07-01T10:00:00.000Z') }),
    );
    occurrencesRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createOccurrenceEntity({ id: 'occ-x', status: 'cancelled' }));
    occurrencesRepository.create.mockImplementation((value) => value);
    occurrencesRepository.save.mockImplementation(async (value) => ({ id: 'occ-x', ...value }));

    await service.confirmOccurrence(
      'event-1',
      { date: '2026-07-01T10:00:00.000Z', status: 'cancelled' },
      actor,
    );

    expect(teamMembersService.assertMembersAvailable).not.toHaveBeenCalled();
    expect(occurrencesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  // ── day notes ──────────────────────────────────────────────────

  it('upserts a day note (create then replace)', async () => {
    dayNotesRepository.findOne.mockResolvedValueOnce(null);
    dayNotesRepository.create.mockImplementation((value) => value);
    dayNotesRepository.save.mockImplementation(async (value) => ({ id: 'note-1', ...value }));

    await service.upsertDayNote('2026-07-01', { note: 'Team offsite' }, actor);

    expect(dayNotesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ noteDate: '2026-07-01', createdBy: 'admin-1' }),
    );
    expect(dayNotesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Team offsite', updatedBy: 'admin-1' }),
    );

    dayNotesRepository.findOne.mockResolvedValueOnce({
      id: 'note-1',
      noteDate: '2026-07-01',
      note: 'old',
    });
    await service.upsertDayNote('2026-07-01', { note: 'Updated' }, actor);
    expect(dayNotesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'note-1', note: 'Updated' }),
    );
  });

  it('rejects a day note with an invalid date format', async () => {
    await expect(
      service.upsertDayNote('July 1st', { note: 'x' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound removing a missing day note', async () => {
    dayNotesRepository.findOne.mockResolvedValue(null);
    await expect(service.removeDayNote('2026-07-01')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── updateOccurrence / cancel / remove ─────────────────────────

  it('re-validates availability when updating guides', async () => {
    eventsRepository.findOne.mockResolvedValue(createEventEntity());
    occurrencesRepository.findOne.mockResolvedValue(
      createOccurrenceEntity({ teamMembers: [] }),
    );

    await service.updateOccurrence(
      'event-1',
      'occ-1',
      { teamMemberIds: ['m2'] },
      actor,
    );

    expect(teamMembersService.assertMembersAvailable).toHaveBeenCalledWith(
      expect.any(Date),
      90,
      ['m2'],
    );
    expect(occurrencesRepository.save).toHaveBeenCalled();
  });

  it('cancels an occurrence', async () => {
    occurrencesRepository.findOne.mockResolvedValue(createOccurrenceEntity());

    await service.cancelOccurrence('event-1', 'occ-1', actor);

    expect(occurrencesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
  });

  it('removes an occurrence', async () => {
    const occurrence = createOccurrenceEntity();
    occurrencesRepository.findOne.mockResolvedValue(occurrence);

    await service.removeOccurrence('event-1', 'occ-1');

    expect(occurrencesRepository.remove).toHaveBeenCalledWith(occurrence);
  });
});

function createEventEntity(overrides: Partial<EventEntity> = {}): EventEntity {
  return {
    id: 'event-1',
    language: 'en',
    type: 'free',
    tourId: null,
    tour: null,
    description: null,
    durationMinutes: 90,
    frequency: 'single',
    startDate: new Date('2026-07-01T10:00:00.000Z'),
    timezone: 'Europe/Copenhagen',
    recurrenceFreq: null,
    recurrenceInterval: null,
    recurrenceByDay: null,
    recurrenceUntil: null,
    status: 'active',
    occurrences: [],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as EventEntity;
}

function createOccurrenceEntity(
  overrides: Partial<EventOccurrenceEntity> = {},
): EventOccurrenceEntity {
  return {
    id: 'occ-1',
    eventId: 'event-1',
    occurrenceDate: new Date('2026-07-01T10:00:00.000Z'),
    note: null,
    status: 'confirmed',
    teamMembers: [],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as EventOccurrenceEntity;
}
