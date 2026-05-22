import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { SetTeamMemberPhotoDto } from './dto/team-member-photo.dto';
import {
  CreateTeamMemberTranslationDto,
  UpdateTeamMemberTranslationDto,
} from './dto/team-member-translation.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
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
    const orderIndex = dto.orderIndex ?? (await this.getNextOrderIndex());

    const member = this.teamMembersRepository.create({
      orderIndex,
      photoMediaId: null,
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

  async clearPhoto(id: string, actor: AuthenticatedAdmin): Promise<void> {
    await this.findEntityOrThrow(id);

    await this.teamMembersRepository.update(
      { id },
      {
        photoMediaId: null,
        updatedBy: actor.id,
      },
    );
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
      name: dto.name,
      role: dto.role,
      imageAlt: dto.imageAlt ?? null,
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

    if ('name' in dto && dto.name !== undefined) {
      translation.name = dto.name;
    }

    if ('role' in dto && dto.role !== undefined) {
      translation.role = dto.role;
    }

    if ('imageAlt' in dto) {
      translation.imageAlt = dto.imageAlt ?? null;
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
          name: t.name,
          role: t.role,
          imageAlt: t.imageAlt,
        },
      ]),
    );

    return {
      id: member.id,
      orderIndex: member.orderIndex,
      photoMediaId: member.photoMediaId,
      photoMedia: this.toMediaResponse(member.photoMedia),
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
