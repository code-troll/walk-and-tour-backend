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

import { TagEntity } from '../../tags/tag.entity';
import { TourItineraryStopEntity } from './tour-itinerary-stop.entity';
import { TourTranslationEntity } from './tour-translation.entity';

@Entity({ name: 'tours' })
@Unique('UQ_tours_slug', ['slug'])
export class TourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ name: 'cover_media_ref', type: 'varchar', length: 255, nullable: true })
  coverMediaRef!: string | null;

  @Column({ name: 'gallery_media_refs', type: 'jsonb', default: [] })
  galleryMediaRefs!: string[];

  @Column({ name: 'publication_status', type: 'varchar', length: 20 })
  publicationStatus!: string;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden!: boolean;

  @Column({ name: 'content_schema', type: 'jsonb' })
  contentSchema!: Record<string, unknown>;

  @Column({
    name: 'price_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  priceAmount!: string | null;

  @Column({ name: 'price_currency', type: 'varchar', length: 10, nullable: true })
  priceCurrency!: string | null;

  @Column({ type: 'numeric', precision: 3, scale: 2 })
  rating!: string;

  @Column({ name: 'review_count', type: 'integer' })
  reviewCount!: number;

  @Column({ name: 'tour_type', type: 'varchar', length: 20 })
  tourType!: string;

  @Column({ name: 'cancellation_type', type: 'varchar', length: 30 })
  cancellationType!: string;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Column({ name: 'start_point', type: 'jsonb' })
  startPoint!: Record<string, unknown>;

  @Column({ name: 'end_point', type: 'jsonb' })
  endPoint!: Record<string, unknown>;

  @Column({ name: 'itinerary_variant', type: 'varchar', length: 20 })
  itineraryVariant!: string;

  @ManyToMany(() => TagEntity)
  @JoinTable({
    name: 'tour_tags',
    joinColumn: { name: 'tour_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_key', referencedColumnName: 'key' },
  })
  tags!: TagEntity[];

  @OneToMany(() => TourItineraryStopEntity, (stop) => stop.tour, {
    cascade: false,
  })
  stops!: TourItineraryStopEntity[];

  @OneToMany(() => TourTranslationEntity, (translation) => translation.tour, {
    cascade: false,
  })
  translations!: TourTranslationEntity[];

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
