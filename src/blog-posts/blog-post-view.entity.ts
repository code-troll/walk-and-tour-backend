import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { BlogPostTranslationEntity } from './blog-post-translation.entity';

@Entity({ name: 'blog_post_views' })
@Unique('UQ_blog_post_views_translation_viewer', ['blogPostTranslationId', 'viewerHash'])
export class BlogPostViewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'blog_post_translation_id', type: 'uuid' })
  blogPostTranslationId!: string;

  @ManyToOne(() => BlogPostTranslationEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_post_translation_id' })
  blogPostTranslation!: BlogPostTranslationEntity;

  @Column({ name: 'viewer_hash', type: 'varchar', length: 64 })
  viewerHash!: string;

  @Column({ name: 'last_viewed_at', type: 'timestamp' })
  lastViewedAt!: Date;
}
