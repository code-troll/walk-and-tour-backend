import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { AdminUserEntity } from '../admin-users/admin-user.entity';
import { RoleEntity } from '../admin-users/role.entity';
import { BlogPostTranslationEntity } from '../blog-posts/blog-post-translation.entity';
import { BlogPostEntity } from '../blog-posts/blog-post.entity';
import { EventDayNoteEntity } from '../events/entities/event-day-note.entity';
import { EventOccurrenceEntity } from '../events/entities/event-occurrence.entity';
import { EventEntity } from '../events/entities/event.entity';
import { HotelEntity } from '../hotels/entities/hotel.entity';
import { HotelTourEntity } from '../hotels/entities/hotel-tour.entity';
import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { NewsletterSubscriberEntity } from '../newsletter-subscribers/newsletter-subscriber.entity';
import { ProposalMediaEntity } from '../proposals/entities/proposal-media.entity';
import { ProposalVersionEntity } from '../proposals/entities/proposal-version.entity';
import { ProposalEntity } from '../proposals/entities/proposal.entity';
import { TagEntity } from '../tags/tag.entity';
import { TeamMemberRecurringUnavailabilityEntity } from '../team-members/entities/team-member-recurring-unavailability.entity';
import { TeamMemberTranslationEntity } from '../team-members/entities/team-member-translation.entity';
import { TeamMemberUnavailableDateEntity } from '../team-members/entities/team-member-unavailable-date.entity';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';
import { TourMediaEntity } from '../tours/entities/tour-media.entity';
import { TourItineraryStopEntity } from '../tours/entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from '../tours/entities/tour-translation.entity';
import { TourEntity } from '../tours/entities/tour.entity';
import { getDatabaseConfig } from '../shared/config/database.config';

export function getTypeOrmOptions(): TypeOrmModuleOptions {
  const config = getDatabaseConfig();

  return {
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: [
      RoleEntity,
      AdminUserEntity,
      BlogPostEntity,
      BlogPostTranslationEntity,
      LanguageEntity,
      NewsletterSubscriberEntity,
      TagEntity,
      MediaAssetEntity,
      ProposalEntity,
      ProposalVersionEntity,
      ProposalMediaEntity,
      TeamMemberEntity,
      TeamMemberTranslationEntity,
      TeamMemberUnavailableDateEntity,
      TeamMemberRecurringUnavailabilityEntity,
      TourEntity,
      TourMediaEntity,
      TourItineraryStopEntity,
      TourTranslationEntity,
      EventEntity,
    HotelEntity,
    HotelTourEntity,
      EventOccurrenceEntity,
      EventDayNoteEntity,
    ],
    migrations: ['dist/database/migrations/*.js'],
    synchronize: false,
  };
}

export function getDataSourceOptions(): DataSourceOptions {
  return getTypeOrmOptions() as DataSourceOptions;
}
