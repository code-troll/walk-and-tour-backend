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

import { MediaAssetEntity } from '../../media/media-asset.entity';
import { TagEntity } from '../../tags/tag.entity';
import { TourMediaEntity } from './tour-media.entity';
import { TourItineraryStopEntity } from './tour-itinerary-stop.entity';
import { TourTranslationEntity } from './tour-translation.entity';

@Entity({ name: 'tours' })
export class TourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @Column({ name: 'cover_media_id', type: 'uuid', nullable: true })
  coverMediaId!: string | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true })
  @JoinColumn({ name: 'cover_media_id' })
  coverMedia!: MediaAssetEntity | null;

  @Column({ name: 'content_schema', type: 'jsonb', nullable: true })
  contentSchema!: Record<string, unknown> | null;

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

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  rating!: string | null;

  @Column({ name: 'review_count', type: 'integer', nullable: true })
  reviewCount!: number | null;

  @Column({ name: 'tour_type', type: 'varchar', length: 20 })
  tourType!: string;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes!: number | null;

  @Column({ name: 'start_point', type: 'jsonb', nullable: true })
  startPoint!: Record<string, unknown> | null;

  @Column({ name: 'end_point', type: 'jsonb', nullable: true })
  endPoint!: Record<string, unknown> | null;

  @Column({ name: 'itinerary_variant', type: 'varchar', length: 20, nullable: true })
  itineraryVariant!: string | null;

  @Column({ name: 'card_tag_key', type: 'varchar', length: 100, nullable: true })
  cardTagKey!: string | null;

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

  @OneToMany(() => TourMediaEntity, (tourMedia) => tourMedia.tour, {
    cascade: false,
  })
  mediaItems!: TourMediaEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
