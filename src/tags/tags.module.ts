import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from './tag.entity';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  imports: [TypeOrmModule.forFeature([TagEntity, LanguageEntity])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TypeOrmModule, TagsService],
})
export class TagsModule {}
