import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { BlogPostEntity } from './blog-post.entity';

@Entity({ name: 'blog_post_translations' })
@Unique('UQ_blog_post_translation_locale', ['blogPostId', 'languageCode'])
export class BlogPostTranslationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'blog_post_id', type: 'uuid' })
  blogPostId!: string;

  @ManyToOne(() => BlogPostEntity, (blogPost) => blogPost.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost!: BlogPostEntity;

  @Column({ name: 'language_code', type: 'varchar', length: 10 })
  languageCode!: string;

  @ManyToOne(() => LanguageEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'language_code', referencedColumnName: 'code' })
  language!: LanguageEntity;

  @Column({ name: 'publication_status', type: 'varchar', length: 20 })
  publicationStatus!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ name: 'html_content', type: 'text' })
  htmlContent!: string;

  @Column({ name: 'seo_title', type: 'varchar', length: 255, nullable: true })
  seoTitle!: string | null;

  @Column({ name: 'seo_description', type: 'text', nullable: true })
  seoDescription!: string | null;

  @Column({ name: 'image_refs', type: 'jsonb', default: [] })
  imageRefs!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
