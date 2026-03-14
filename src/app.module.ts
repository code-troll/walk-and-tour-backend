import { Module } from '@nestjs/common';

import { AdminMediaModule } from './admin-media/admin-media.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { BlogPostsModule } from './blog-posts/blog-posts.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LanguagesModule } from './languages/languages.module';
import { NewsletterSubscribersModule } from './newsletter-subscribers/newsletter-subscribers.module';
import { StorageModule } from './storage/storage.module';
import { TagsModule } from './tags/tags.module';
import { ToursModule } from './tours/tours.module';

@Module({
  imports: [
    DatabaseModule,
    AdminMediaModule,
    AdminAuthModule,
    AdminUsersModule,
    BlogPostsModule,
    LanguagesModule,
    NewsletterSubscribersModule,
    StorageModule,
    TagsModule,
    ToursModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
