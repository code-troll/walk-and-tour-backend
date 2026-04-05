import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProposalMediaEntity } from './proposal-media.entity';
import { ProposalVersionEntity } from './proposal-version.entity';

@Entity({ name: 'proposals' })
export class ProposalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 24, unique: true })
  hash!: string;

  @Column({ type: 'varchar', length: 10 })
  language!: string;

  @Column({ name: 'recipient_name', type: 'varchar', length: 255, nullable: true })
  recipientName!: string | null;

  @Column({ name: 'recipient_email', type: 'varchar', length: 255, nullable: true })
  recipientEmail!: string | null;

  @Column({ name: 'acceptance_status', type: 'varchar', length: 20, default: 'pending' })
  acceptanceStatus!: string;

  @Column({ name: 'publication_status', type: 'varchar', length: 20, default: 'unpublished' })
  publicationStatus!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @OneToMany(() => ProposalVersionEntity, (version) => version.proposal, {
    cascade: false,
  })
  versions!: ProposalVersionEntity[];

  @OneToMany(() => ProposalMediaEntity, (media) => media.proposal, {
    cascade: false,
  })
  mediaItems!: ProposalMediaEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
