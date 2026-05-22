import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { TeamMembersService } from './team-members.service';

describe('TeamMembersService', () => {
  let service: TeamMembersService;
  let teamMembersRepository: RepositoryMock<TeamMemberEntity>;
  let translationsRepository: RepositoryMock<TeamMemberTranslationEntity>;
  let mediaAssetsRepository: RepositoryMock<MediaAssetEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

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
    service = new TeamMembersService(
      teamMembersRepository as never,
      translationsRepository as never,
      mediaAssetsRepository as never,
      languagesRepository as never,
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
