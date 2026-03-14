import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TourMediaEntity } from '../tours/entities/tour-media.entity';

@Entity({ name: 'media_assets' })
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'media_type', type: 'varchar', length: 20 })
  mediaType!: 'image' | 'video';

  @Column({ name: 'storage_path', type: 'varchar', length: 255, unique: true })
  storagePath!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType!: string;

  @Column({ type: 'integer' })
  size!: number;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => TourMediaEntity, (tourMedia) => tourMedia.media, {
    cascade: false,
  })
  tourUsages!: TourMediaEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
