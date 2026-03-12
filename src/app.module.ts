import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { LanguagesModule } from './languages/languages.module';
import { TagsModule } from './tags/tags.module';
import { ToursModule } from './tours/tours.module';

@Module({
  imports: [DatabaseModule, LanguagesModule, TagsModule, ToursModule],
  controllers: [HealthController],
})
export class AppModule {}
