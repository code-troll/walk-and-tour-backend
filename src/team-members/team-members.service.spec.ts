import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TeamMemberRecurringUnavailabilityEntity } from './entities/team-member-recurring-unavailability.entity';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
import { TeamMemberUnavailableDateEntity } from './entities/team-member-unavailable-date.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { TeamMembersService } from './team-members.service';

describe('TeamMembersService', () => {
  let service: TeamMembersService;
  let teamMembersRepository: RepositoryMock<TeamMemberEntity>;
  let translationsRepository: RepositoryMock<TeamMemberTranslationEntity>;
  let mediaAssetsRepository: RepositoryMock<MediaAssetEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;
  let unavailableDatesRepository: RepositoryMock<TeamMemberUnavailableDateEntity>;
  let recurringUnavailabilityRepository: RepositoryMock<TeamMemberRecurringUnavailabilityEntity>;

  const actor = {
    id: 'admin-1',
    email: 'admin@example.com',
    roleName: 'editor' as const,
    status: 'active' as const,
    auth0UserId: 'auth0|123',
  };

  beforeEach(() => {
    teamMembersRepository = createRepositoryMock<TeamMemberEntity>();
    translationsRepository = createRepositoryMock<TeamMemberTranslationEntity>();
    mediaAssetsRepository = createRepositoryMock<MediaAssetEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    unavailableDatesRepository =
      createRepositoryMock<TeamMemberUnavailableDateEntity>();
    recurringUnavailabilityRepository =
      createRepositoryMock<TeamMemberRecurringUnavailabilityEntity>();
    service = new TeamMembersService(
      teamMembersRepository as never,
      translationsRepository as never,
      mediaAssetsRepository as never,
      languagesRepository as never,
      unavailableDatesRepository as never,
      recurringUnavailabilityRepository as never,
    );
  });

  // ── findAll ────────────────────────────────────────────────────

  it('returns all team members ordered by orderIndex', async () => {
    teamMembersRepository.find.mockResolvedValue([
      createTeamMemberEntity({ orderIndex: 0 }),
      createTeamMemberEntity({ id: 'member-2', orderIndex: 1 }),
    ]);

    const result = await service.findAll();

    expect(teamMembersRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { orderIndex: 'ASC' },
      }),
    );
    expect(result).toHaveLength(2);
  });

  // ── findOne ────────────────────────────────────────────────────

  it('returns a single team member by id', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());

    const result = await service.findOne('member-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-1',
        name: 'Ayelen Salazar',
        orderIndex: 0,
      }),
    );
  });

  it('throws NotFoundException when the team member does not exist', async () => {
    teamMembersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('nonexistent')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── create ─────────────────────────────────────────────────────

  it('creates a team member with name and photo required', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxIndex: 2 }),
    };
    teamMembersRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    teamMembersRepository.create.mockImplementation((value) => value);
    teamMembersRepository.save.mockImplementation(async (value) => ({
      id: 'member-new',
      ...value,
    }));
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({
        id: 'member-new',
        name: 'Ayelen Salazar',
        orderIndex: 3,
        photoMediaId: 'media-1',
        translations: [],
      }),
    );

    const result = await service.create(
      { name: 'Ayelen Salazar', mediaId: 'media-1' },
      actor,
    );

    expect(mediaAssetsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    expect(teamMembersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ayelen Salazar',
        orderIndex: 3,
        photoMediaId: 'media-1',
        imageAlt: null,
        linkedinUrl: null,
        isPublished: false,
        createdBy: 'admin-1',
        updatedBy: 'admin-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 'member-new' }),
    );
  });

  it('rejects creation with an unknown media asset', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ name: 'Test', mediaId: 'nonexistent' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a team member with optional fields', async () => {
    mediaAssetsRepository.findOne.mockResolvedValue(createMediaAssetEntity());
    teamMembersRepository.create.mockImplementation((value) => value);
    teamMembersRepository.save.mockImplementation(async (value) => ({
      id: 'member-new',
      ...value,
    }));
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({ id: 'member-new' }),
    );

    await service.create(
      {
        name: 'Test',
        mediaId: 'media-1',
        orderIndex: 5,
        imageAlt: 'Photo of Test',
        linkedinUrl: 'https://linkedin.com/in/test',
        isPublished: true,
      },
      actor,
    );

    expect(teamMembersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderIndex: 5,
        imageAlt: 'Photo of Test',
        linkedinUrl: 'https://linkedin.com/in/test',
        isPublished: true,
      }),
    );
  });

  // ── update ─────────────────────────────────────────────────────

  it('updates shared team member fields including name and imageAlt', async () => {
    teamMembersRepository.findOne
      .mockResolvedValueOnce(createTeamMemberEntity())
      .mockResolvedValueOnce(
        createTeamMemberEntity({
          name: 'Updated Name',
          imageAlt: 'New alt',
          isPublished: true,
        }),
      );

    const result = await service.update(
      'member-1',
      { name: 'Updated Name', imageAlt: 'New alt', isPublished: true },
      actor,
    );

    expect(teamMembersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Name',
        imageAlt: 'New alt',
        isPublished: true,
        updatedBy: 'admin-1',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ isPublished: true }),
    );
  });

  it('clears imageAlt when set to null', async () => {
    teamMembersRepository.findOne
      .mockResolvedValueOnce(createTeamMemberEntity({ imageAlt: 'Old alt' }))
      .mockResolvedValueOnce(createTeamMemberEntity({ imageAlt: null }));

    await service.update('member-1', { imageAlt: null }, actor);

    expect(teamMembersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ imageAlt: null }),
    );
  });

  // ── remove ─────────────────────────────────────────────────────

  it('removes a team member', async () => {
    const entity = createTeamMemberEntity();
    teamMembersRepository.findOne.mockResolvedValue(entity);

    await service.remove('member-1');

    expect(teamMembersRepository.remove).toHaveBeenCalledWith(entity);
  });

  it('throws NotFoundException when removing a nonexistent member', async () => {
    teamMembersRepository.findOne.mockResolvedValue(null);

    await expect(service.remove('nonexistent')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── setPhoto ───────────────────────────────────────────────────

  it('sets the photo media on a team member', async () => {
    teamMembersRepository.findOne
      .mockResolvedValueOnce(createTeamMemberEntity())
      .mockResolvedValueOnce(createTeamMemberEntity({ photoMediaId: 'media-2' }));
    mediaAssetsRepository.findOne.mockResolvedValue(
      createMediaAssetEntity({ id: 'media-2' }),
    );

    await service.setPhoto('member-1', { mediaId: 'media-2' }, actor);

    expect(teamMembersRepository.update).toHaveBeenCalledWith(
      { id: 'member-1' },
      { photoMediaId: 'media-2', updatedBy: 'admin-1' },
    );
  });

  it('rejects unknown media asset on setPhoto', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());
    mediaAssetsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.setPhoto('member-1', { mediaId: 'nonexistent' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── createTranslation ──────────────────────────────────────────

  it('creates a role translation for a team member', async () => {
    teamMembersRepository.findOne
      .mockResolvedValueOnce(createTeamMemberEntity({ translations: [] }))
      .mockResolvedValueOnce(
        createTeamMemberEntity({
          translations: [createTranslationEntity({ languageCode: 'en', role: 'Founder' })],
        }),
      );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);
    translationsRepository.create.mockImplementation((value) => value);

    await service.createTranslation(
      'member-1',
      { languageCode: 'en', role: 'Founder' },
      actor,
    );

    expect(translationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 'member-1',
        languageCode: 'en',
        role: 'Founder',
      }),
    );
    expect(teamMembersRepository.update).toHaveBeenCalledWith(
      { id: 'member-1' },
      { updatedBy: 'admin-1' },
    );
  });

  it('rejects duplicate translations for the same locale', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({
        translations: [createTranslationEntity({ languageCode: 'en' })],
      }),
    );
    languagesRepository.findOne.mockResolvedValue({ code: 'en' } as LanguageEntity);

    await expect(
      service.createTranslation('member-1', { languageCode: 'en', role: 'Test' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects translations for unknown language codes', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({ translations: [] }),
    );
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createTranslation('member-1', { languageCode: 'fr', role: 'Test' }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── updateTranslation ──────────────────────────────────────────

  it('updates a role translation for a team member', async () => {
    teamMembersRepository.findOne
      .mockResolvedValueOnce(
        createTeamMemberEntity({
          translations: [createTranslationEntity({ languageCode: 'en' })],
        }),
      )
      .mockResolvedValueOnce(
        createTeamMemberEntity({
          translations: [createTranslationEntity({ languageCode: 'en', role: 'Updated Role' })],
        }),
      );

    await service.updateTranslation('member-1', 'en', { role: 'Updated Role' }, actor);

    expect(translationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'Updated Role' }),
    );
  });

  it('throws NotFoundException when updating a nonexistent translation', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({ translations: [] }),
    );

    await expect(
      service.updateTranslation('member-1', 'en', { role: 'Test' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // ── deleteTranslation ──────────────────────────────────────────

  it('deletes a translation', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({
        translations: [createTranslationEntity({ id: 'trans-1', languageCode: 'en' })],
      }),
    );

    await service.deleteTranslation('member-1', 'en', actor);

    expect(translationsRepository.delete).toHaveBeenCalledWith({ id: 'trans-1' });
    expect(teamMembersRepository.update).toHaveBeenCalledWith(
      { id: 'member-1' },
      { updatedBy: 'admin-1' },
    );
  });

  it('throws NotFoundException when deleting a nonexistent translation', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({ translations: [] }),
    );

    await expect(
      service.deleteTranslation('member-1', 'en', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // ── toAdminResponse ────────────────────────────────────────────

  it('returns the correct admin response shape with name and imageAlt on base', async () => {
    teamMembersRepository.findOne.mockResolvedValue(
      createTeamMemberEntity({
        name: 'Ayelen Salazar',
        imageAlt: 'Photo',
        translations: [
          createTranslationEntity({ languageCode: 'en', role: 'Founder' }),
        ],
      }),
    );

    const result = (await service.findOne('member-1')) as Record<string, unknown>;

    expect(result).toEqual(
      expect.objectContaining({
        id: 'member-1',
        name: 'Ayelen Salazar',
        imageAlt: 'Photo',
        orderIndex: 0,
        photoMediaId: 'media-1',
        linkedinUrl: null,
        isPublished: false,
        translations: {
          en: { role: 'Founder' },
        },
        translationAvailability: [{ languageCode: 'en' }],
        audit: expect.objectContaining({
          createdBy: 'admin-1',
          updatedBy: 'admin-1',
        }),
      }),
    );
  });

  // ── Availability ───────────────────────────────────────────────

  it('lists both kinds of availability for a team member', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());
    unavailableDatesRepository.find.mockResolvedValue([
      { id: 'date-1', startDate: '2026-07-01', endDate: '2026-07-10', reason: 'Vacation' },
    ]);
    recurringUnavailabilityRepository.find.mockResolvedValue([
      { id: 'rule-1', dayOfWeek: 0, startTime: null, endTime: null },
    ]);

    const result = (await service.listAvailability('member-1')) as Record<
      string,
      unknown
    >;

    expect(result).toEqual({
      unavailableDates: [
        { id: 'date-1', startDate: '2026-07-01', endDate: '2026-07-10', reason: 'Vacation' },
      ],
      recurringUnavailability: [
        { id: 'rule-1', dayOfWeek: 0, startTime: null, endTime: null },
      ],
    });
  });

  it('adds an unavailable date range', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());
    unavailableDatesRepository.create.mockImplementation((value) => value);
    unavailableDatesRepository.find.mockResolvedValue([]);
    recurringUnavailabilityRepository.find.mockResolvedValue([]);

    await service.addUnavailableDate(
      'member-1',
      { startDate: '2026-07-01', endDate: '2026-07-10', reason: 'Vacation' },
      actor,
    );

    expect(unavailableDatesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamMemberId: 'member-1',
        startDate: '2026-07-01',
        endDate: '2026-07-10',
        reason: 'Vacation',
      }),
    );
  });

  it('rejects an unavailable date range with endDate before startDate', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());

    await expect(
      service.addUnavailableDate(
        'member-1',
        { startDate: '2026-07-10', endDate: '2026-07-01' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a recurring rule with only one of start/end time', async () => {
    teamMembersRepository.findOne.mockResolvedValue(createTeamMemberEntity());

    await expect(
      service.addRecurringUnavailability(
        'member-1',
        { dayOfWeek: 1, startTime: '09:00' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // ── assertMembersAvailable ─────────────────────────────────────

  it('passes when no team members are assigned', async () => {
    await expect(
      service.assertMembersAvailable(new Date('2026-07-01T10:00:00Z'), 90, []),
    ).resolves.toBeUndefined();
  });

  it('rejects when a team member does not exist', async () => {
    teamMembersRepository.find.mockResolvedValue([]);

    await expect(
      service.assertMembersAvailable(new Date('2026-07-01T10:00:00Z'), 90, [
        'ghost',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the date falls inside an unavailable date block', async () => {
    teamMembersRepository.find.mockResolvedValue([{ id: 'member-1' }]);
    unavailableDatesRepository.find.mockResolvedValue([
      { teamMemberId: 'member-1', startDate: '2026-07-01', endDate: '2026-07-10' },
    ]);
    recurringUnavailabilityRepository.find.mockResolvedValue([]);

    await expect(
      service.assertMembersAvailable(new Date('2026-07-05T10:00:00Z'), 90, [
        'member-1',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the time window overlaps a recurring weekly rule', async () => {
    // 2026-07-01 is a Wednesday (UTC day 3).
    teamMembersRepository.find.mockResolvedValue([{ id: 'member-1' }]);
    unavailableDatesRepository.find.mockResolvedValue([]);
    recurringUnavailabilityRepository.find.mockResolvedValue([
      { teamMemberId: 'member-1', dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
    ]);

    await expect(
      service.assertMembersAvailable(new Date('2026-07-01T10:00:00Z'), 90, [
        'member-1',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes when the recurring rule is on a different weekday', async () => {
    teamMembersRepository.find.mockResolvedValue([{ id: 'member-1' }]);
    unavailableDatesRepository.find.mockResolvedValue([]);
    recurringUnavailabilityRepository.find.mockResolvedValue([
      { teamMemberId: 'member-1', dayOfWeek: 0, startTime: '09:00', endTime: '12:00' },
    ]);

    await expect(
      service.assertMembersAvailable(new Date('2026-07-01T10:00:00Z'), 90, [
        'member-1',
      ]),
    ).resolves.toBeUndefined();
  });

  it('passes when the time window does not overlap the recurring rule', async () => {
    teamMembersRepository.find.mockResolvedValue([{ id: 'member-1' }]);
    unavailableDatesRepository.find.mockResolvedValue([]);
    recurringUnavailabilityRepository.find.mockResolvedValue([
      { teamMemberId: 'member-1', dayOfWeek: 3, startTime: '06:00', endTime: '09:00' },
    ]);

    await expect(
      service.assertMembersAvailable(new Date('2026-07-01T10:00:00Z'), 90, [
        'member-1',
      ]),
    ).resolves.toBeUndefined();
  });

  // ── listAvailableMembers ───────────────────────────────────────

  it('excludes members blocked for the occurrence window', async () => {
    // 2026-07-01 is a Wednesday (UTC day 3). member-1 has a date block,
    // member-2 an overlapping weekly rule, member-3 is free.
    teamMembersRepository.find.mockResolvedValue([
      createTeamMemberEntity({ id: 'member-1' }),
      createTeamMemberEntity({ id: 'member-2' }),
      createTeamMemberEntity({ id: 'member-3' }),
    ]);
    unavailableDatesRepository.find.mockResolvedValue([
      { teamMemberId: 'member-1', startDate: '2026-07-01', endDate: '2026-07-10' },
    ]);
    recurringUnavailabilityRepository.find.mockResolvedValue([
      { teamMemberId: 'member-2', dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
    ]);

    const result = (await service.listAvailableMembers(
      new Date('2026-07-01T10:00:00Z'),
      90,
    )) as Array<{ id: string }>;

    expect(result.map((member) => member.id)).toEqual(['member-3']);
  });

  it('returns an empty list when there are no team members', async () => {
    teamMembersRepository.find.mockResolvedValue([]);

    await expect(
      service.listAvailableMembers(new Date('2026-07-01T10:00:00Z'), 90),
    ).resolves.toEqual([]);
  });
});

function createTeamMemberEntity(
  overrides: Partial<TeamMemberEntity> = {},
): TeamMemberEntity {
  return {
    id: 'member-1',
    name: 'Ayelen Salazar',
    orderIndex: 0,
    photoMediaId: 'media-1',
    photoMedia: createMediaAssetEntity(),
    imageAlt: null,
    linkedinUrl: null,
    isPublished: false,
    translations: [
      createTranslationEntity({ languageCode: 'en' }),
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as TeamMemberEntity;
}

function createTranslationEntity(
  overrides: Partial<TeamMemberTranslationEntity> = {},
): TeamMemberTranslationEntity {
  return {
    id: 'trans-1',
    teamMemberId: 'member-1',
    languageCode: 'en',
    role: 'Founder & Director',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TeamMemberTranslationEntity;
}

function createMediaAssetEntity(
  overrides: Partial<MediaAssetEntity> = {},
): MediaAssetEntity {
  return {
    id: 'media-1',
    mediaType: 'image',
    storagePath: 'team/photo.jpg',
    contentType: 'image/jpeg',
    size: 1024,
    originalFilename: 'photo.jpg',
    createdBy: 'admin-1',
    tourUsages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MediaAssetEntity;
}
