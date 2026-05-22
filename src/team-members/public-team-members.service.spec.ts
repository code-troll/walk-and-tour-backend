import { NotFoundException } from '@nestjs/common';

import { createRepositoryMock, RepositoryMock } from '../../test/utils/repository.mock';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { PublicTeamMembersService } from './public-team-members.service';

describe('PublicTeamMembersService', () => {
  let service: PublicTeamMembersService;
  let teamMembersRepository: RepositoryMock<TeamMemberEntity>;
  let languagesRepository: RepositoryMock<LanguageEntity>;

  beforeEach(() => {
    teamMembersRepository = createRepositoryMock<TeamMemberEntity>();
    languagesRepository = createRepositoryMock<LanguageEntity>();
    service = new PublicTeamMembersService(
      teamMembersRepository as never,
      languagesRepository as never,
    );
  });

  it('returns published team members with role from translations', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    teamMembersRepository.find.mockResolvedValue([
      createPublicTeamMember({
        id: 'member-1',
        name: 'Ayelen Salazar',
        imageAlt: 'Photo',
        orderIndex: 0,
        translations: [
          { languageCode: 'en', role: 'Founder' },
        ] as unknown as TeamMemberEntity['translations'],
      }),
      createPublicTeamMember({
        id: 'member-2',
        name: 'Maria Fantozzi',
        orderIndex: 1,
        translations: [
          { languageCode: 'en', role: 'Partnerships' },
        ] as unknown as TeamMemberEntity['translations'],
      }),
    ] as TeamMemberEntity[]);

    const result = await service.findAll('en');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'member-1',
        name: 'Ayelen Salazar',
        role: 'Founder',
        imageAlt: 'Photo',
        photoMedia: expect.objectContaining({ id: 'media-1' }),
      }),
      expect.objectContaining({
        id: 'member-2',
        name: 'Maria Fantozzi',
        role: 'Partnerships',
      }),
    ]);
  });

  it('includes members without a translation for the requested locale with null role', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    teamMembersRepository.find.mockResolvedValue([
      createPublicTeamMember({
        translations: [
          { languageCode: 'es', role: 'Fundadora' },
        ] as unknown as TeamMemberEntity['translations'],
      }),
    ] as TeamMemberEntity[]);

    const result = await service.findAll('en');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'member-1',
        name: 'Ayelen Salazar',
        role: null,
      }),
    ]);
  });

  it('includes linkedinUrl in the public response when present', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    teamMembersRepository.find.mockResolvedValue([
      createPublicTeamMember({
        linkedinUrl: 'https://linkedin.com/in/test',
        translations: [
          { languageCode: 'en', role: 'Role' },
        ] as unknown as TeamMemberEntity['translations'],
      }),
    ] as TeamMemberEntity[]);

    const result = await service.findAll('en');

    expect(result).toEqual([
      expect.objectContaining({
        linkedinUrl: 'https://linkedin.com/in/test',
      }),
    ]);
  });

  it('rejects unavailable locales', async () => {
    languagesRepository.findOne.mockResolvedValue(null);

    await expect(service.findAll('fr')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only queries published members', async () => {
    languagesRepository.findOne.mockResolvedValue({
      code: 'en',
      isEnabled: true,
    } as LanguageEntity);
    teamMembersRepository.find.mockResolvedValue([]);

    await service.findAll('en');

    expect(teamMembersRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true },
        order: { orderIndex: 'ASC' },
      }),
    );
  });
});

function createPublicTeamMember(
  overrides: Partial<TeamMemberEntity> = {},
): TeamMemberEntity {
  const base = {
    id: 'member-1',
    name: 'Ayelen Salazar',
    orderIndex: 0,
    photoMediaId: 'media-1',
    photoMedia: createMediaAssetEntity(),
    imageAlt: null,
    linkedinUrl: null,
    isPublished: true,
    translations: [
      { languageCode: 'en', role: 'Founder & Director' },
    ],
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  return base as unknown as TeamMemberEntity;
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
