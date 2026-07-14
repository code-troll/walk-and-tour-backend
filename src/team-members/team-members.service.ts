import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import {
  CreateRecurringUnavailabilityDto,
  CreateUnavailableDateDto,
} from './dto/team-member-availability.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { SetTeamMemberPhotoDto } from './dto/team-member-photo.dto';
import {
  CreateTeamMemberTranslationDto,
  UpdateTeamMemberTranslationDto,
} from './dto/team-member-translation.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamMemberRecurringUnavailabilityEntity } from './entities/team-member-recurring-unavailability.entity';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
import { TeamMemberUnavailableDateEntity } from './entities/team-member-unavailable-date.entity';
import { TeamMemberEntity } from './entities/team-member.entity';

@Injectable()
export class TeamMembersService {
  constructor(
    @InjectRepository(TeamMemberEntity)
    private readonly teamMembersRepository: Repository<TeamMemberEntity>,
    @InjectRepository(TeamMemberTranslationEntity)
    private readonly translationsRepository: Repository<TeamMemberTranslationEntity>,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
    @InjectRepository(TeamMemberUnavailableDateEntity)
    private readonly unavailableDatesRepository: Repository<TeamMemberUnavailableDateEntity>,
    @InjectRepository(TeamMemberRecurringUnavailabilityEntity)
    private readonly recurringUnavailabilityRepository: Repository<TeamMemberRecurringUnavailabilityEntity>,
  ) {}

  async findAll(): Promise<unknown[]> {
    const members = await this.teamMembersRepository.find({
      relations: {
        photoMedia: true,
        translations: true,
      },
      order: {
        orderIndex: 'ASC',
      },
    });

    return members.map((member) => this.toAdminResponse(member));
  }

  async findOne(id: string): Promise<unknown> {
    const member = await this.findEntityOrThrow(id);
    return this.toAdminResponse(member);
  }

  async create(dto: CreateTeamMemberDto, actor: AuthenticatedAdmin): Promise<unknown> {
    await this.getMediaAssetOrThrow(dto.mediaId);
    const orderIndex = dto.orderIndex ?? (await this.getNextOrderIndex());

    const member = this.teamMembersRepository.create({
      name: dto.name.trim(),
      orderIndex,
      photoMediaId: dto.mediaId,
      imageAlt: dto.imageAlt ?? null,
      linkedinUrl: dto.linkedinUrl ?? null,
      isPublished: dto.isPublished ?? false,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    const saved = await this.teamMembersRepository.save(member);

    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateTeamMemberDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const existing = await this.findEntityOrThrow(id);

    if ('name' in dto && dto.name !== undefined) {
      existing.name = dto.name.trim();
    }

    if ('imageAlt' in dto) {
      existing.imageAlt = dto.imageAlt ?? null;
    }

    if ('orderIndex' in dto && dto.orderIndex !== undefined) {
      existing.orderIndex = dto.orderIndex;
    }

    if ('linkedinUrl' in dto) {
      existing.linkedinUrl = dto.linkedinUrl ?? null;
    }

    if ('isPublished' in dto && dto.isPublished !== undefined) {
      existing.isPublished = dto.isPublished;
    }

    existing.updatedBy = actor.id;

    await this.teamMembersRepository.save(existing);

    return this.findOne(existing.id);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.findEntityOrThrow(id);
    await this.teamMembersRepository.remove(existing);
  }

  async setPhoto(
    id: string,
    dto: SetTeamMemberPhotoDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    await this.findEntityOrThrow(id);
    await this.getMediaAssetOrThrow(dto.mediaId);

    await this.teamMembersRepository.update(
      { id },
      {
        photoMediaId: dto.mediaId,
        updatedBy: actor.id,
      },
    );

    return this.findOne(id);
  }

  async createTranslation(
    id: string,
    dto: CreateTeamMemberTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const member = await this.findEntityOrThrow(id);
    await this.assertLanguageExists(dto.languageCode);

    const existing = member.translations.find(
      (t) => t.languageCode === dto.languageCode,
    );

    if (existing) {
      throw new ConflictException(
        `Translation "${dto.languageCode}" already exists for team member "${id}".`,
      );
    }

    const translation = this.translationsRepository.create({
      teamMemberId: id,
      languageCode: dto.languageCode,
      role: dto.role,
    });

    await this.translationsRepository.save(translation);
    await this.touchTeamMember(id, actor);

    return this.findOne(id);
  }

  async updateTranslation(
    id: string,
    languageCode: string,
    dto: UpdateTeamMemberTranslationDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    const member = await this.findEntityOrThrow(id);
    const translation = this.findTranslationOrThrow(member, languageCode);

    if ('role' in dto && dto.role !== undefined) {
      translation.role = dto.role;
    }

    await this.translationsRepository.save(translation);
    await this.touchTeamMember(id, actor);

    return this.findOne(id);
  }

  async deleteTranslation(
    id: string,
    languageCode: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const member = await this.findEntityOrThrow(id);
    const translation = this.findTranslationOrThrow(member, languageCode);

    await this.translationsRepository.delete({ id: translation.id });
    await this.touchTeamMember(id, actor);
  }

  // ── Availability (unavailability) ──────────────────────────────────

  async listAvailability(id: string): Promise<unknown> {
    await this.findEntityOrThrow(id);

    const [unavailableDates, recurring] = await Promise.all([
      this.unavailableDatesRepository.find({
        where: { teamMemberId: id },
        order: { startDate: 'ASC' },
      }),
      this.recurringUnavailabilityRepository.find({
        where: { teamMemberId: id },
        order: { dayOfWeek: 'ASC' },
      }),
    ]);

    return {
      unavailableDates: unavailableDates.map((entry) =>
        this.toUnavailableDateResponse(entry),
      ),
      recurringUnavailability: recurring.map((entry) =>
        this.toRecurringUnavailabilityResponse(entry),
      ),
    };
  }

  async addUnavailableDate(
    id: string,
    dto: CreateUnavailableDateDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    await this.findEntityOrThrow(id);

    const startDate = dto.startDate.slice(0, 10);
    const endDate = dto.endDate.slice(0, 10);
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate.');
    }

    const entry = this.unavailableDatesRepository.create({
      teamMemberId: id,
      startDate,
      endDate,
      reason: dto.reason ?? null,
    });

    await this.unavailableDatesRepository.save(entry);
    await this.touchTeamMember(id, actor);

    return this.listAvailability(id);
  }

  async removeUnavailableDate(id: string, dateId: string): Promise<void> {
    await this.findEntityOrThrow(id);

    const entry = await this.unavailableDatesRepository.findOne({
      where: { id: dateId, teamMemberId: id },
    });
    if (!entry) {
      throw new NotFoundException(
        `Unavailable date "${dateId}" was not found for team member "${id}".`,
      );
    }

    await this.unavailableDatesRepository.delete({ id: entry.id });
  }

  async addRecurringUnavailability(
    id: string,
    dto: CreateRecurringUnavailabilityDto,
    actor: AuthenticatedAdmin,
  ): Promise<unknown> {
    await this.findEntityOrThrow(id);

    const hasStart = dto.startTime !== undefined;
    const hasEnd = dto.endTime !== undefined;
    if (hasStart !== hasEnd) {
      throw new BadRequestException(
        'Provide both startTime and endTime, or neither for a whole-day rule.',
      );
    }
    if (hasStart && hasEnd && dto.endTime! <= dto.startTime!) {
      throw new BadRequestException('endTime must be after startTime.');
    }

    const entry = this.recurringUnavailabilityRepository.create({
      teamMemberId: id,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
    });

    await this.recurringUnavailabilityRepository.save(entry);
    await this.touchTeamMember(id, actor);

    return this.listAvailability(id);
  }

  async removeRecurringUnavailability(id: string, ruleId: string): Promise<void> {
    await this.findEntityOrThrow(id);

    const entry = await this.recurringUnavailabilityRepository.findOne({
      where: { id: ruleId, teamMemberId: id },
    });
    if (!entry) {
      throw new NotFoundException(
        `Recurring unavailability "${ruleId}" was not found for team member "${id}".`,
      );
    }

    await this.recurringUnavailabilityRepository.delete({ id: entry.id });
  }

  /**
   * Validates that every team member in `ids` exists and is available for the
   * occurrence window `[date, date + durationMinutes]`. Throws a
   * `BadRequestException` on the first conflict. All comparisons are in UTC.
   */
  async assertMembersAvailable(
    date: Date,
    durationMinutes: number,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const members = await this.teamMembersRepository.find({
      where: { id: In(ids) },
    });
    const foundIds = new Set(members.map((member) => member.id));
    const missing = ids.filter((memberId) => !foundIds.has(memberId));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Unknown team member(s): ${missing.join(', ')}`,
      );
    }

    const [dateBlocks, recurring] = await Promise.all([
      this.unavailableDatesRepository.find({
        where: { teamMemberId: In(ids) },
      }),
      this.recurringUnavailabilityRepository.find({
        where: { teamMemberId: In(ids) },
      }),
    ]);

    const occurrenceYmd = toUtcYmd(date);
    const occurrenceWeekday = date.getUTCDay();
    const occurrenceStartMinute = date.getUTCHours() * 60 + date.getUTCMinutes();
    const occurrenceEndMinute = occurrenceStartMinute + durationMinutes;

    for (const block of dateBlocks) {
      if (occurrenceYmd >= block.startDate && occurrenceYmd <= block.endDate) {
        throw new BadRequestException(
          `Team member "${block.teamMemberId}" is unavailable on ${occurrenceYmd}.`,
        );
      }
    }

    for (const rule of recurring) {
      if (rule.dayOfWeek !== occurrenceWeekday) {
        continue;
      }
      if (rule.startTime === null || rule.endTime === null) {
        throw new BadRequestException(
          `Team member "${rule.teamMemberId}" is unavailable on weekday ${occurrenceWeekday}.`,
        );
      }
      const ruleStartMinute = timeToMinutes(rule.startTime);
      const ruleEndMinute = timeToMinutes(rule.endTime);
      if (
        occurrenceStartMinute < ruleEndMinute &&
        ruleStartMinute < occurrenceEndMinute
      ) {
        throw new BadRequestException(
          `Team member "${rule.teamMemberId}" is unavailable between ${rule.startTime} and ${rule.endTime} on weekday ${occurrenceWeekday}.`,
        );
      }
    }
  }

  /**
   * Returns the admin representation of every team member who is **available**
   * for the occurrence window `[date, date + durationMinutes]`. Powers the
   * guide picker so admins only see assignable members. All comparisons use UTC,
   * mirroring {@link assertMembersAvailable}.
   */
  async listAvailableMembers(
    date: Date,
    durationMinutes: number,
  ): Promise<unknown[]> {
    const members = await this.teamMembersRepository.find({
      relations: {
        photoMedia: true,
        translations: true,
      },
      order: { orderIndex: 'ASC' },
    });
    if (members.length === 0) {
      return [];
    }

    const ids = members.map((member) => member.id);
    const [dateBlocks, recurring] = await Promise.all([
      this.unavailableDatesRepository.find({
        where: { teamMemberId: In(ids) },
      }),
      this.recurringUnavailabilityRepository.find({
        where: { teamMemberId: In(ids) },
      }),
    ]);

    const blocksByMember = groupByMember(dateBlocks);
    const rulesByMember = groupByMember(recurring);

    return members
      .filter(
        (member) =>
          !isUnavailableAt(
            date,
            durationMinutes,
            blocksByMember.get(member.id) ?? [],
            rulesByMember.get(member.id) ?? [],
          ),
      )
      .map((member) => this.toAdminResponse(member));
  }

  private toUnavailableDateResponse(
    entry: TeamMemberUnavailableDateEntity,
  ): unknown {
    return {
      id: entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      reason: entry.reason,
    };
  }

  private toRecurringUnavailabilityResponse(
    entry: TeamMemberRecurringUnavailabilityEntity,
  ): unknown {
    return {
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    };
  }

  private async findEntityOrThrow(id: string): Promise<TeamMemberEntity> {
    const member = await this.teamMembersRepository.findOne({
      where: { id },
      relations: {
        photoMedia: true,
        translations: true,
      },
    });

    if (!member) {
      throw new NotFoundException(`Team member "${id}" was not found.`);
    }

    return member;
  }

  private async getMediaAssetOrThrow(id: string): Promise<MediaAssetEntity> {
    const asset = await this.mediaAssetsRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new BadRequestException(`Unknown media asset "${id}".`);
    }

    return asset;
  }

  private async assertLanguageExists(languageCode: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: { code: languageCode },
    });

    if (!language) {
      throw new BadRequestException(
        `Team member translations reference unknown language code: ${languageCode}`,
      );
    }
  }

  private findTranslationOrThrow(
    member: TeamMemberEntity,
    languageCode: string,
  ): TeamMemberTranslationEntity {
    const translation = member.translations.find(
      (entry) => entry.languageCode === languageCode,
    );

    if (!translation) {
      throw new NotFoundException(
        `Translation "${languageCode}" was not found for team member "${member.id}".`,
      );
    }

    return translation;
  }

  private async getNextOrderIndex(): Promise<number> {
    const result = await this.teamMembersRepository
      .createQueryBuilder('tm')
      .select('COALESCE(MAX(tm.order_index), -1)', 'maxIndex')
      .getRawOne<{ maxIndex: number }>();

    return (result?.maxIndex ?? -1) + 1;
  }

  private async touchTeamMember(id: string, actor: AuthenticatedAdmin): Promise<void> {
    await this.teamMembersRepository.update(
      { id },
      {
        updatedBy: actor.id,
      },
    );
  }

  private toAdminResponse(member: TeamMemberEntity): unknown {
    const translations = Object.fromEntries(
      member.translations.map((t) => [
        t.languageCode,
        {
          role: t.role,
        },
      ]),
    );

    return {
      id: member.id,
      name: member.name,
      orderIndex: member.orderIndex,
      photoMediaId: member.photoMediaId,
      photoMedia: this.toMediaResponse(member.photoMedia),
      imageAlt: member.imageAlt,
      linkedinUrl: member.linkedinUrl,
      isPublished: member.isPublished,
      translations,
      translationAvailability: member.translations.map((t) => ({
        languageCode: t.languageCode,
      })),
      audit: {
        createdBy: member.createdBy,
        updatedBy: member.updatedBy,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      },
    };
  }

  private toMediaResponse(media: MediaAssetEntity | null): {
    id: string;
    mediaType: 'image' | 'video';
    storagePath: string;
    contentUrl: string;
    contentType: string;
    size: number;
    originalFilename: string;
  } | null {
    if (!media) {
      return null;
    }

    return {
      id: media.id,
      mediaType: media.mediaType,
      storagePath: media.storagePath,
      contentUrl: this.buildAdminContentUrl(media.id),
      contentType: media.contentType,
      size: media.size,
      originalFilename: media.originalFilename,
    };
  }

  private buildAdminContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/admin/media/${mediaId}/content`;
  }
}

/** Formats a Date as a UTC `YYYY-MM-DD` string for date-block comparisons. */
function toUtcYmd(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converts an `HH:mm` or `HH:mm:ss` string into minutes since midnight. */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** Groups unavailability rows by their `teamMemberId`. */
function groupByMember<T extends { teamMemberId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.teamMemberId);
    if (bucket) {
      bucket.push(row);
    } else {
      grouped.set(row.teamMemberId, [row]);
    }
  }
  return grouped;
}

/**
 * True when a member with the given unavailability is unavailable for the
 * occurrence window `[date, date + durationMinutes]`. UTC throughout.
 */
function isUnavailableAt(
  date: Date,
  durationMinutes: number,
  dateBlocks: TeamMemberUnavailableDateEntity[],
  recurring: TeamMemberRecurringUnavailabilityEntity[],
): boolean {
  const occurrenceYmd = toUtcYmd(date);
  const occurrenceWeekday = date.getUTCDay();
  const occurrenceStartMinute = date.getUTCHours() * 60 + date.getUTCMinutes();
  const occurrenceEndMinute = occurrenceStartMinute + durationMinutes;

  for (const block of dateBlocks) {
    if (occurrenceYmd >= block.startDate && occurrenceYmd <= block.endDate) {
      return true;
    }
  }

  for (const rule of recurring) {
    if (rule.dayOfWeek !== occurrenceWeekday) {
      continue;
    }
    if (rule.startTime === null || rule.endTime === null) {
      return true;
    }
    const ruleStartMinute = timeToMinutes(rule.startTime);
    const ruleEndMinute = timeToMinutes(rule.endTime);
    if (
      occurrenceStartMinute < ruleEndMinute &&
      ruleStartMinute < occurrenceEndMinute
    ) {
      return true;
    }
  }

  return false;
}
