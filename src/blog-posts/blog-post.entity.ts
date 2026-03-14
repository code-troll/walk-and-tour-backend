import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { TagEntity } from '../tags/tag.entity';
import { BlogPostTranslationEntity } from './blog-post-translation.entity';

@Entity({ name: 'blog_posts' })
@Unique('UQ_blog_posts_slug', ['slug'])
export class BlogPostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'hero_media_ref', type: 'varchar', length: 255, nullable: true })
  heroMediaRef!: string | null;

  @Column({ name: 'publication_status', type: 'varchar', length: 20 })
  publicationStatus!: string;

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

  @Column({ name: 'published_by', type: 'uuid', nullable: true })
  publishedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt!: Date | null;
}
