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
import { ProposalEntity } from './proposal.entity';

@Entity({ name: 'proposal_media' })
@Unique('UQ_proposal_media_attachment', ['proposalId', 'mediaId'])
@Unique('UQ_proposal_media_order', ['proposalId', 'orderIndex'])
export class ProposalMediaEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'row_id' })
  rowId!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId!: string;

  @Column({ name: 'media_id', type: 'uuid' })
  mediaId!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'alt_text', type: 'jsonb', nullable: true })
  altText!: Record<string, string> | null;

  @ManyToOne(() => ProposalEntity, (proposal) => proposal.mediaItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal!: ProposalEntity;

  @ManyToOne(() => MediaAssetEntity, (media) => media.proposalUsages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'media_id' })
  media!: MediaAssetEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
