import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlogPostEntity } from '../blog-posts/blog-post.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { MediaController } from '../media/media.controller';
import { StorageModule } from '../storage/storage.module';
import { TourEntity } from '../tours/entities/tour.entity';
import { TourMediaEntity } from '../tours/entities/tour-media.entity';
import { AdminMediaController } from './admin-media.controller';
import { AdminMediaService } from './admin-media.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      MediaAssetEntity,
      TourEntity,
      TourMediaEntity,
      BlogPostEntity,
    ]),
  ],
  controllers: [AdminMediaController, MediaController],
  providers: [AdminMediaService],
})
export class AdminMediaModule {}
