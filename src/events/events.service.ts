import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { RecurrenceFrequency } from '../shared/domain';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';
import { TeamMembersService } from '../team-members/team-members.service';
import { TourEntity } from '../tours/entities/tour.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { ConfirmOccurrenceDto } from './dto/confirm-occurrence.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateOccurrenceDto } from './dto/update-occurrence.dto';
import { UpsertDayNoteDto } from './dto/upsert-day-note.dto';
import { EventDayNoteEntity } from './entities/event-day-note.entity';
import { EventOccurrenceEntity } from './entities/event-occurrence.entity';
import { EventEntity } from './entities/event.entity';
import { ExpandableEvent, expandOccurrences } from './events.recurrence';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepository: Repository<EventEntity>,
    @InjectRepository(EventOccurrenceEntity)
    private readonly occurrencesRepository: Repository<EventOccurrenceEntity>,
    @InjectRepository(TourEntity)
    private readonly toursRepository: Repository<TourEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    @InjectRepository(EventDayNoteEntity)
    private readonly dayNotesRepository: Repository<EventDayNoteEntity>,
    private readonly teamMembersService: TeamMembersService,
  ) {}

  // ── Events (templates) ─────────────────────────────────────────────

  async findAll(): Promise<unknown[]> {
    const events = await this.eventsRepository.find({
      relations: { occurrences: { teamMembers: true }, tour: true },
      order: { startDate: 'ASC' },
    });

    return events.map((event) => this.toEventResponse(event));
  }

  async findOne(id: string): Promise<unknown> {
    const event = await this.findEntityOrThrow(id);
    return this.toEventResponse(event);
  }

  async create(dto: CreateEventDto, actor: AuthenticatedAdmin): Promise<unknown> {
    await this.assertLanguageExists(dto.language);
    if (dto.tourId) {
      await this.assertTourExists(dto.tourId);
    }

    const isRecurring = dto.frequency === 'recurring';
    const recurrence = isRecurring ? dto.recurrence! : undefined;
    const startDate = new Date(dto.startDate);
    const timezone =
      dto.timezone ?? getProviderConfig().defaultEventTimezone;
    this.assertValidTimezone(timezone);

    if (recurrence?.until) {
      this.assertRecurrenceWindow(startDate, new Date(recurrence.until));
    }

    const event = this.eventsRepository.create({
      language: dto.language,
      type: dto.type,
      tourId: dto.tourId ?? null,
      description: dto.description ?? null,
      durationMinutes: dto.durationMinutes,
      frequency: dto.frequency,
      startDate,
      timezone,
      recurrenceFreq: recurrence ? recurrence.freq : null,
      recurrenceInterval: recurrence ? recurrence.interval : null,
      recurrenceByDay: recurrence ? recurrence.byDay ?? null : null,
      recurrenceUntil: recurrence?.until ? new Date(recurrence.until) : null,
      status: 'active',
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    const saved = await this.eventsRepository.save(event);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);

    if ('language' in dto && dto.language !== undefined) {
      await this.assertLanguageExists(dto.language);
      existing.language = dto.language;
    }
    if ('type' in dto && dto.type !== undefined) {
      existing.type = dto.type;
    }
    if ('tourId' in dto) {
      if (dto.tourId) {
        await this.assertTourExists(dto.tourId);
      }
      existing.tourId = dto.tourId ?? null;
    }
    if ('description' in dto) {
      existing.description = dto.description ?? null;
    }
    if ('durationMinutes' in dto && dto.durationMinutes !== undefined) {
      existing.durationMinutes = dto.durationMinutes;
    }
    if ('startDate' in dto && dto.startDate !== undefined) {
      existing.startDate = new Date(dto.startDate);
    }
    if ('timezone' in dto && dto.timezone !== undefined) {
      this.assertValidTimezone(dto.timezone);
      existing.timezone = dto.timezone;
    }
    if ('frequency' in dto && dto.frequency !== undefined) {
      existing.frequency = dto.frequency;
    }
    if ('recurrence' in dto && dto.recurrence !== undefined) {
      existing.recurrenceFreq = dto.recurrence.freq;
      existing.recurrenceInterval = dto.recurrence.interval;
      existing.recurrenceByDay = dto.recurrence.byDay ?? null;
      existing.recurrenceUntil = dto.recurrence.until
        ? new Date(dto.recurrence.until)
        : null;
    }

    if (existing.frequency === 'single') {
      existing.recurrenceFreq = null;
      existing.recurrenceInterval = null;
      existing.recurrenceByDay = null;
      existing.recurrenceUntil = null;
    } else if (!existing.recurrenceFreq) {
      throw new BadRequestException(
        'Recurring events require a recurrence rule.',
      );
    } else if (existing.recurrenceUntil) {
      this.assertRecurrenceWindow(existing.startDate, existing.recurrenceUntil);
    }

    existing.updatedBy = actor.id;
    await this.eventsRepository.save(existing);

    return this.findOne(existing.id);
  }

  async cancel(id: string, actor: AuthenticatedAdmin): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);
    existing.status = 'cancelled';
    existing.updatedBy = actor.id;
    await this.eventsRepository.save(existing);
    return this.findOne(existing.id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findEntityOrThrow(id);
    await this.eventsRepository.remove(existing);
  }

  // ── Occurrences (concretions) ──────────────────────────────────────

  async listOccurrences(
    id: string,
    fromIso: string,
    toIso: string,
  ): Promise<unknown[]> {
    const event = await this.findEntityOrThrow(id);
    const from = new Date(fromIso);
    const to = new Date(toIso);

    const stored = await this.occurrencesRepository.find({
      where: { eventId: id },
      relations: { teamMembers: true },
    });

    const items = this.mergeOccurrenceWindow(event, stored, from, to, true);
    items.sort(byDateAscending);

    return items;
  }

  /**
   * Cross-event calendar feed: expands and merges occurrences for **every**
   * event within `[from, to]`, each item carrying its parent event context so a
   * calendar UI can render the whole schedule in one call. Candidate (ghost)
   * dates are only produced for `active` events; cancelled events contribute
   * their already-stored occurrences only.
   */
  async listCalendar(fromIso: string, toIso: string): Promise<unknown[]> {
    const from = new Date(fromIso);
    const to = new Date(toIso);

    const events = await this.eventsRepository.find({
      relations: { occurrences: { teamMembers: true }, tour: true },
      order: { startDate: 'ASC' },
    });

    const items: Array<Record<string, unknown>> = [];
    for (const event of events) {
      const merged = this.mergeOccurrenceWindow(
        event,
        event.occurrences ?? [],
        from,
        to,
        event.status === 'active',
      );
      for (const item of merged) {
        items.push({ ...item, eventId: event.id, event: this.toEventSummary(event) });
      }
    }

    items.sort(byDateAscending);

    return items;
  }

  /**
   * Merges rule-expanded candidate dates with stored occurrences for a single
   * event inside `[from, to]`. When `expandCandidates` is false, only stored
   * occurrences within the window are returned (no unconfirmed ghosts).
   */
  private mergeOccurrenceWindow(
    event: EventEntity,
    stored: EventOccurrenceEntity[],
    from: Date,
    to: Date,
    expandCandidates: boolean,
  ): Array<Record<string, unknown>> {
    const items: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    const storedByTime = new Map(
      stored.map((occurrence) => [occurrence.occurrenceDate.getTime(), occurrence]),
    );

    const candidates = expandCandidates
      ? expandOccurrences(this.toExpandableEvent(event), from, to)
      : [];

    for (const candidate of candidates) {
      const match = storedByTime.get(candidate.getTime());
      if (match) {
        items.push(this.toOccurrenceListItem(match));
        seen.add(match.id);
      } else {
        items.push({ date: candidate.toISOString(), status: 'unconfirmed' });
      }
    }

    // Surface stored occurrences inside the window that the current rule no
    // longer produces (e.g. the schedule was edited after confirmation, or the
    // event was cancelled).
    for (const occurrence of stored) {
      if (seen.has(occurrence.id)) {
        continue;
      }
      const time = occurrence.occurrenceDate.getTime();
      if (time >= from.getTime() && time <= to.getTime()) {
        items.push(this.toOccurrenceListItem(occurrence));
      }
    }

    return items;
  }

  async confirmOccurrence(
    id: string,
    dto: ConfirmOccurrenceDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const event = await this.findEntityOrThrow(id);
    if (event.status === 'cancelled') {
      throw new BadRequestException(
        'Cannot confirm occurrences for a cancelled event.',
      );
    }

    const requested = new Date(dto.date);
    const requestedYmd = toUtcYmd(requested);
    const dayStart = new Date(`${requestedYmd}T00:00:00.000Z`);
    const dayEnd = new Date(`${requestedYmd}T23:59:59.999Z`);

    const candidates = expandOccurrences(
      this.toExpandableEvent(event),
      dayStart,
      dayEnd,
    );
    const match = candidates.find(
      (candidate) => toUtcYmd(candidate) === requestedYmd,
    );
    if (!match) {
      throw new BadRequestException(
        `Date ${requestedYmd} does not match the event's schedule.`,
      );
    }

    const duplicate = await this.occurrencesRepository.findOne({
      where: { eventId: id, occurrenceDate: match },
    });
    if (duplicate) {
      throw new ConflictException(
        `An occurrence is already confirmed for ${requestedYmd}.`,
      );
    }

    const status = dto.status ?? 'confirmed';
    const teamMemberIds = dto.teamMemberIds ?? [];
    // Availability only matters for a date that is actually being run. Marking a
    // date off (`cancelled`) never needs a guide.
    if (status === 'confirmed') {
      await this.teamMembersService.assertMembersAvailable(
        match,
        event.durationMinutes,
        teamMemberIds,
      );
    }

    const occurrence = this.occurrencesRepository.create({
      eventId: id,
      occurrenceDate: match,
      note: dto.note ?? null,
      status,
      teamMembers: teamMemberIds.map(
        (memberId) => ({ id: memberId }) as TeamMemberEntity,
      ),
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    const saved = await this.occurrencesRepository.save(occurrence);
    return this.findOccurrenceResponse(saved.id);
  }

  async updateOccurrence(
    id: string,
    occurrenceId: string,
    dto: UpdateOccurrenceDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const event = await this.findEntityOrThrow(id);
    const occurrence = await this.findOccurrenceOrThrow(id, occurrenceId);

    if ('teamMemberIds' in dto && dto.teamMemberIds !== undefined) {
      await this.teamMembersService.assertMembersAvailable(
        occurrence.occurrenceDate,
        event.durationMinutes,
        dto.teamMemberIds,
      );
      occurrence.teamMembers = dto.teamMemberIds.map(
        (memberId) => ({ id: memberId }) as TeamMemberEntity,
      );
    }
    if ('note' in dto) {
      occurrence.note = dto.note ?? null;
    }

    occurrence.updatedBy = actor.id;
    await this.occurrencesRepository.save(occurrence);

    return this.findOccurrenceResponse(occurrence.id);
  }

  async cancelOccurrence(
    id: string,
    occurrenceId: string,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const occurrence = await this.findOccurrenceOrThrow(id, occurrenceId);
    occurrence.status = 'cancelled';
    occurrence.updatedBy = actor.id;
    await this.occurrencesRepository.save(occurrence);
    return this.findOccurrenceResponse(occurrence.id);
  }

  async removeOccurrence(id: string, occurrenceId: string): Promise<void> {
    const occurrence = await this.findOccurrenceOrThrow(id, occurrenceId);
    await this.occurrencesRepository.remove(occurrence);
  }

  // ── Day notes ──────────────────────────────────────────────────────

  async listDayNotes(fromIso: string, toIso: string): Promise<unknown[]> {
    const fromYmd = toUtcYmd(new Date(fromIso));
    const toYmd = toUtcYmd(new Date(toIso));

    const notes = await this.dayNotesRepository.find({
      where: { noteDate: Between(fromYmd, toYmd) },
      order: { noteDate: 'ASC' },
    });

    return notes.map((note) => this.toDayNoteResponse(note));
  }

  /** Creates or replaces the note for a single `YYYY-MM-DD` date. */
  async upsertDayNote(
    date: string,
    dto: UpsertDayNoteDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const noteDate = assertYmd(date);

    const existing = await this.dayNotesRepository.findOne({
      where: { noteDate },
    });

    const entity =
      existing ??
      this.dayNotesRepository.create({
        noteDate,
        createdBy: actor.id,
      });
    entity.note = dto.note;
    entity.updatedBy = actor.id;

    const saved = await this.dayNotesRepository.save(entity);
    return this.toDayNoteResponse(saved);
  }

  async removeDayNote(date: string): Promise<void> {
    const noteDate = assertYmd(date);
    const note = await this.dayNotesRepository.findOne({ where: { noteDate } });
    if (!note) {
      throw new NotFoundException(`No day note exists for ${noteDate}.`);
    }
    await this.dayNotesRepository.remove(note);
  }

  private toDayNoteResponse(note: EventDayNoteEntity): unknown {
    return {
      id: note.id,
      date: note.noteDate,
      note: note.note,
      audit: {
        createdBy: note.createdBy,
        updatedBy: note.updatedBy,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    };
  }

  // ── Internals ──────────────────────────────────────────────────────

  private async findEntityOrThrow(id: string): Promise<EventEntity> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: { occurrences: { teamMembers: true }, tour: true },
    });

    if (!event) {
      throw new NotFoundException(`Event "${id}" was not found.`);
    }

    return event;
  }

  private async findOccurrenceOrThrow(
    eventId: string,
    occurrenceId: string,
  ): Promise<EventOccurrenceEntity> {
    const occurrence = await this.occurrencesRepository.findOne({
      where: { id: occurrenceId, eventId },
      relations: { teamMembers: true },
    });

    if (!occurrence) {
      throw new NotFoundException(
        `Occurrence "${occurrenceId}" was not found for event "${eventId}".`,
      );
    }

    return occurrence;
  }

  private async findOccurrenceResponse(occurrenceId: string): Promise<unknown> {
    const occurrence = await this.occurrencesRepository.findOne({
      where: { id: occurrenceId },
      relations: { teamMembers: true },
    });

    if (!occurrence) {
      throw new NotFoundException(`Occurrence "${occurrenceId}" was not found.`);
    }

    return this.toOccurrenceResponse(occurrence);
  }

  private async assertLanguageExists(languageCode: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: { code: languageCode },
    });

    if (!language) {
      throw new BadRequestException(
        `Events reference unknown language code: ${languageCode}`,
      );
    }
  }

  private async assertTourExists(tourId: string): Promise<void> {
    const tour = await this.toursRepository.findOne({ where: { id: tourId } });
    if (!tour) {
      throw new BadRequestException(`Unknown tour "${tourId}".`);
    }
  }

  private assertRecurrenceWindow(startDate: Date, until: Date): void {
    if (until.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'Recurrence end date must be on or after the start date.',
      );
    }
  }

  private assertValidTimezone(timezone: string): void {
    if (!isValidTimeZone(timezone)) {
      throw new BadRequestException(`Unknown timezone "${timezone}".`);
    }
  }

  private toExpandableEvent(event: EventEntity): ExpandableEvent {
    return {
      frequency: event.frequency as ExpandableEvent['frequency'],
      startDate: event.startDate,
      recurrence:
        event.frequency === 'recurring' && event.recurrenceFreq
          ? {
              freq: event.recurrenceFreq as RecurrenceFrequency,
              interval: event.recurrenceInterval ?? 1,
              byDay: event.recurrenceByDay,
              until: event.recurrenceUntil,
            }
          : null,
    };
  }

  private toEventResponse(event: EventEntity): unknown {
    const occurrences = event.occurrences ?? [];
    return {
      id: event.id,
      language: event.language,
      type: event.type,
      tourId: event.tourId,
      tourName: event.tour?.name ?? null,
      description: event.description,
      durationMinutes: event.durationMinutes,
      frequency: event.frequency,
      startDate: event.startDate,
      timezone: event.timezone,
      recurrence:
        event.frequency === 'recurring'
          ? {
              freq: event.recurrenceFreq,
              interval: event.recurrenceInterval,
              byDay: event.recurrenceByDay,
              until: event.recurrenceUntil,
            }
          : null,
      status: event.status,
      occurrences: occurrences
        .slice()
        .sort(
          (a, b) =>
            a.occurrenceDate.getTime() - b.occurrenceDate.getTime(),
        )
        .map((occurrence) => this.toOccurrenceResponse(occurrence)),
      audit: {
        createdBy: event.createdBy,
        updatedBy: event.updatedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    };
  }

  /** Compact event context attached to each calendar item. */
  private toEventSummary(event: EventEntity): Record<string, unknown> {
    return {
      id: event.id,
      description: event.description,
      language: event.language,
      type: event.type,
      tourId: event.tourId,
      tourName: event.tour?.name ?? null,
      durationMinutes: event.durationMinutes,
      timezone: event.timezone,
      frequency: event.frequency,
      status: event.status,
    };
  }

  private toOccurrenceResponse(occurrence: EventOccurrenceEntity): unknown {
    return {
      id: occurrence.id,
      eventId: occurrence.eventId,
      date: occurrence.occurrenceDate,
      note: occurrence.note,
      status: occurrence.status,
      teamMemberIds: (occurrence.teamMembers ?? []).map((member) => member.id),
      audit: {
        createdBy: occurrence.createdBy,
        updatedBy: occurrence.updatedBy,
        createdAt: occurrence.createdAt,
        updatedAt: occurrence.updatedAt,
      },
    };
  }

  private toOccurrenceListItem(
    occurrence: EventOccurrenceEntity,
  ): Record<string, unknown> {
    return {
      date: occurrence.occurrenceDate.toISOString(),
      status: occurrence.status,
      occurrenceId: occurrence.id,
      note: occurrence.note,
      teamMemberIds: (occurrence.teamMembers ?? []).map((member) => member.id),
    };
  }
}

/** Formats a Date as a UTC `YYYY-MM-DD` string. */
function toUtcYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Validates and returns a `YYYY-MM-DD` date string, throwing on a bad format. */
function assertYmd(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException(
      `Invalid date "${date}". Expected YYYY-MM-DD.`,
    );
  }
  return date;
}

/** Ascending comparator over the ISO `date` field of occurrence list items. */
function byDateAscending(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): number {
  return String(a.date) < String(b.date)
    ? -1
    : String(a.date) > String(b.date)
      ? 1
      : 0;
}

/** True when `timezone` is a valid IANA zone the runtime recognises. */
function isValidTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
