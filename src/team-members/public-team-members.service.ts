import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { getProviderConfig } from '../shared/config/provider.config';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
import { TeamMemberEntity } from './entities/team-member.entity';

@Injectable()
export class PublicTeamMembersService {
  constructor(
    @InjectRepository(TeamMemberEntity)
    private readonly teamMembersRepository: Repository<TeamMemberEntity>,
    @InjectRepository(LanguageEntity)
    private readonly languagesRepository: Repository<LanguageEntity>,
  ) {}

  async findAll(locale: string): Promise<unknown[]> {
    await this.assertPublicLocale(locale);

    const members = await this.teamMembersRepository.find({
      where: { isPublished: true },
      relations: {
        photoMedia: true,
        translations: true,
      },
      order: {
        orderIndex: 'ASC',
      },
    });

    return members
      .map((member) => {
        const translation = this.findTranslationForLocale(member, locale);
        return translation ? this.toPublicResponse(member, translation) : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }

  private async assertPublicLocale(locale: string): Promise<void> {
    const language = await this.languagesRepository.findOne({
      where: {
        code: locale,
        isEnabled: true,
      },
    });

    if (!language) {
      throw new NotFoundException(`Locale "${locale}" is not publicly available.`);
    }
  }

  private findTranslationForLocale(
    member: TeamMemberEntity,
    locale: string,
  ): TeamMemberTranslationEntity | null {
    return (
      member.translations.find((t) => t.languageCode === locale) ?? null
    );
  }

  private toPublicResponse(
    member: TeamMemberEntity,
    translation: TeamMemberTranslationEntity,
  ): unknown {
    return {
      id: member.id,
      orderIndex: member.orderIndex,
      linkedinUrl: member.linkedinUrl,
      name: translation.name,
      role: translation.role,
      imageAlt: translation.imageAlt,
      photoMedia: this.toMediaResponse(member.photoMedia),
    };
  }

  private toMediaResponse(media: MediaAssetEntity | null): {
    id: string;
    contentUrl: string;
    contentType: string;
    originalFilename: string;
  } | null {
    if (!media) {
      return null;
    }

    return {
      id: media.id,
      contentUrl: this.buildPublicContentUrl(media.id),
      contentType: media.contentType,
      originalFilename: media.originalFilename,
    };
  }

  private buildPublicContentUrl(mediaId: string): string {
    const { appBaseUrl } = getProviderConfig();
    return `${appBaseUrl.replace(/\/$/, '')}/api/media/${mediaId}/content`;
  }
}
