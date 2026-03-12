import { Module } from '@nestjs/common';

import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LanguagesModule } from './languages/languages.module';
import { TagsModule } from './tags/tags.module';
import { ToursModule } from './tours/tours.module';

@Module({
  imports: [
    DatabaseModule,
    AdminAuthModule,
    AdminUsersModule,
    LanguagesModule,
    TagsModule,
    ToursModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
