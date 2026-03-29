import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MediaAssetEntity } from '../media/media-asset.entity';
import { TagEntity } from '../tags/tag.entity';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';

@Entity({ name: 'blog_posts' })
export class BlogPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'hero_media_id', type: 'uuid', nullable: true })
  heroMediaId!: string | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true })
  @JoinColumn({ name: 'hero_media_id' })
  heroMedia!: MediaAssetEntity | null;

  @Column({ name: 'card_tag_key', type: 'varchar', length: 100, nullable: true })
  cardTagKey!: string | null;

  @ManyToMany(() => TagEntity)
  @JoinTable({
    name: 'blog_post_tags',
    joinColumn: { name: 'blog_post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_key', referencedColumnName: 'key' },
  })
  tags!: TagEntity[];

  @OneToMany(() => BlogPostTranslationEntity, (translation) => translation.blogPost, {
    cascade: false,
  })
  translations!: BlogPostTranslationEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt!: Date | null;
}
