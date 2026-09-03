import { Module } from '@nestjs/common';

import { AdminMediaController } from '../admin-media/admin-media.controller';
import { AdminMediaService } from '../admin-media/admin-media.service';
import { AdminAuthController } from '../admin-auth/admin-auth.controller';
import { AdminAuthService } from '../admin-auth/admin-auth.service';
import { Auth0TokenVerifierService } from '../admin-auth/auth0-token-verifier.service';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminUsersController } from '../admin-users/admin-users.controller';
import { AdminUsersService } from '../admin-users/admin-users.service';
import { RolesController } from '../admin-users/roles.controller';
import { RolesService } from '../admin-users/roles.service';
import { BlogPostsController } from '../blog-posts/blog-posts.controller';
import { BlogPostsService } from '../blog-posts/blog-posts.service';
import { PublicBlogPostsService } from '../blog-posts/public-blog-posts.service';
import { EventsController } from '../events/events.controller';
import { EventsService } from '../events/events.service';
import { HotelAuthController } from '../hotel-auth/hotel-auth.controller';
import { HotelAuthService } from '../hotel-auth/hotel-auth.service';
import { HotelJwtAuthGuard } from '../hotel-auth/guards/hotel-jwt-auth.guard';
import { HotelsController } from '../hotels/hotels.controller';
import { HotelsService } from '../hotels/hotels.service';
import { HotelUsersService } from '../hotels/hotel-users.service';
import { HealthController } from '../health/health.controller';
import { LanguagesController } from '../languages/languages.controller';
import { LanguagesService } from '../languages/languages.service';
import { MediaController } from '../media/media.controller';
import { NewsletterSubscribersController } from '../newsletter-subscribers/newsletter-subscribers.controller';
import {
  NewsletterPublicRateLimitGuard,
  NewsletterPublicRateLimitStore,
} from '../newsletter-subscribers/newsletter-public-rate-limit.guard';
import { NewsletterSubscribersService } from '../newsletter-subscribers/newsletter-subscribers.service';
import { ProposalsController } from '../proposals/proposals.controller';
import { PublicProposalsController } from '../proposals/public-proposals.controller';
import { ProposalsService } from '../proposals/proposals.service';
import { TagsController } from '../tags/tags.controller';
import { TagsService } from '../tags/tags.service';
import { TeamMembersController } from '../team-members/team-members.controller';
import { TeamMembersService } from '../team-members/team-members.service';
import { PublicTeamMembersService } from '../team-members/public-team-members.service';
import { PublicToursController } from '../tours/public-tours.controller';
import { ToursController } from '../tours/tours.controller';
import { PublicToursService } from '../tours/public-tours.service';
import { ToursService } from '../tours/tours.service';

const EMPTY_SERVICE = {};

@Module({
  controllers: [
    AdminAuthController,
    AdminMediaController,
    MediaController,
    AdminUsersController,
    RolesController,
    BlogPostsController,
    HealthController,
    LanguagesController,
    NewsletterSubscribersController,
    ProposalsController,
    PublicProposalsController,
    TagsController,
    PublicToursController,
    ToursController,
    TeamMembersController,
    EventsController,
    HotelsController,
    HotelAuthController,
  ],
  providers: [
    { provide: AdminUsersService, useValue: EMPTY_SERVICE },
    { provide: AdminMediaService, useValue: EMPTY_SERVICE },
    { provide: AdminAuthService, useValue: EMPTY_SERVICE },
    { provide: Auth0TokenVerifierService, useValue: EMPTY_SERVICE },
    { provide: RolesService, useValue: EMPTY_SERVICE },
    { provide: BlogPostsService, useValue: EMPTY_SERVICE },
    { provide: PublicBlogPostsService, useValue: EMPTY_SERVICE },
    { provide: LanguagesService, useValue: EMPTY_SERVICE },
    { provide: NewsletterSubscribersService, useValue: EMPTY_SERVICE },
    { provide: NewsletterPublicRateLimitGuard, useValue: EMPTY_SERVICE },
    { provide: NewsletterPublicRateLimitStore, useValue: EMPTY_SERVICE },
    { provide: ProposalsService, useValue: EMPTY_SERVICE },
    { provide: TagsService, useValue: EMPTY_SERVICE },
    { provide: PublicToursService, useValue: EMPTY_SERVICE },
    { provide: ToursService, useValue: EMPTY_SERVICE },
    { provide: TeamMembersService, useValue: EMPTY_SERVICE },
    { provide: PublicTeamMembersService, useValue: EMPTY_SERVICE },
    { provide: EventsService, useValue: EMPTY_SERVICE },
    { provide: HotelsService, useValue: EMPTY_SERVICE },
    { provide: HotelUsersService, useValue: EMPTY_SERVICE },
    { provide: HotelAuthService, useValue: EMPTY_SERVICE },
    { provide: HotelJwtAuthGuard, useValue: EMPTY_SERVICE },
    { provide: AdminJwtAuthGuard, useValue: EMPTY_SERVICE },
    { provide: AdminRolesGuard, useValue: EMPTY_SERVICE },
  ],
})
export class OpenApiExportModule {}
