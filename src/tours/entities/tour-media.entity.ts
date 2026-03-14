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

import { MediaAssetEntity } from '../../media/media-asset.entity';
import { TourEntity } from './tour.entity';

@Entity({ name: 'tour_media' })
@Unique('UQ_tour_media_attachment', ['tourId', 'mediaId'])
@Unique('UQ_tour_media_order', ['tourId', 'orderIndex'])
export class TourMediaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'row_id' })
  rowId!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @Column({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'alt_text', type: 'jsonb', nullable: true })
  altText!: Record<string, string> | null;

  @ManyToOne(() => TourEntity, (tour) => tour.mediaItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;

  @ManyToOne(() => MediaAssetEntity, (media) => media.tourUsages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'media_id' })
  media!: MediaAssetEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
