import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { StorageModule } from '../storage/storage.module';
import { TagEntity } from '../tags/tag.entity';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';
import { BlogPostViewEntity } from './blog-post-view.entity';
import { BlogPostEntity } from './blog-post.entity';
import { BlogPostsController } from './blog-posts.controller';
import { BlogPostsService } from './blog-posts.service';
import { PublicBlogPostsService } from './public-blog-posts.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      BlogPostEntity,
      BlogPostTranslationEntity,
      BlogPostViewEntity,
      MediaAssetEntity,
      TagEntity,
      LanguageEntity,
    ]),
  ],
  controllers: [BlogPostsController],
  providers: [BlogPostsService, PublicBlogPostsService],
})
export class BlogPostsModule {}
