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

import { LanguageEntity } from '../../languages/language.entity';
import { TourEntity } from './tour.entity';

@Entity({ name: 'tour_translations' })
@Unique('UQ_tour_translation_locale', ['tourId', 'languageCode'])
export class TourTranslationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, (tour) => tour.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;

  @Column({ name: 'language_code', type: 'varchar', length: 10 })
  languageCode!: string;

  @ManyToOne(() => LanguageEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'language_code', referencedColumnName: 'code' })
  language!: LanguageEntity;

  @Column({ name: 'translation_status', type: 'varchar', length: 20 })
  translationStatus!: string;

  @Column({ name: 'publication_status', type: 'varchar', length: 20 })
  publicationStatus!: string;

  @Column({ name: 'booking_reference_id', type: 'varchar', length: 255, nullable: true })
  bookingReferenceId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
