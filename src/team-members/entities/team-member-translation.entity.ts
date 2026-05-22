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
import { TeamMemberEntity } from './team-member.entity';

@Entity({ name: 'team_member_translations' })
@Unique('UQ_team_member_translation_locale', ['teamMemberId', 'languageCode'])
export class TeamMemberTranslationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_member_id', type: 'uuid' })
  teamMemberId!: string;

  @ManyToOne(() => TeamMemberEntity, (member) => member.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_member_id' })
  teamMember!: TeamMemberEntity;

  @Column({ name: 'language_code', type: 'varchar', length: 10 })
  languageCode!: string;

  @ManyToOne(() => LanguageEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'language_code', referencedColumnName: 'code' })
  language!: LanguageEntity;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  role!: string;

  @Column({ name: 'image_alt', type: 'varchar', length: 255, nullable: true })
  imageAlt!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
