import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MediaAssetEntity } from '../../media/media-asset.entity';
import { TeamMemberTranslationEntity } from './team-member-translation.entity';

@Entity({ name: 'team_members' })
export class TeamMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'photo_media_id', type: 'uuid', nullable: true })
  photoMediaId!: string | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true })
  @JoinColumn({ name: 'photo_media_id' })
  photoMedia!: MediaAssetEntity | null;

  @Column({ name: 'linkedin_url', type: 'varchar', length: 500, nullable: true })
  linkedinUrl!: string | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished!: boolean;

  @OneToMany(() => TeamMemberTranslationEntity, (t) => t.teamMember, {
    cascade: false,
  })
  translations!: TeamMemberTranslationEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
