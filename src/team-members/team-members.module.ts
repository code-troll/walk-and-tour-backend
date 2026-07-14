import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { TeamMemberRecurringUnavailabilityEntity } from './entities/team-member-recurring-unavailability.entity';
import { TeamMemberTranslationEntity } from './entities/team-member-translation.entity';
import { TeamMemberUnavailableDateEntity } from './entities/team-member-unavailable-date.entity';
import { TeamMemberEntity } from './entities/team-member.entity';
import { PublicTeamMembersService } from './public-team-members.service';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamMemberEntity,
      TeamMemberTranslationEntity,
      TeamMemberUnavailableDateEntity,
      TeamMemberRecurringUnavailabilityEntity,
      MediaAssetEntity,
      LanguageEntity,
    ]),
  ],
  controllers: [TeamMembersController],
  providers: [TeamMembersService, PublicTeamMembersService],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
