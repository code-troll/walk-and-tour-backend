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

import { ProposalEntity } from './proposal.entity';

@Entity({ name: 'proposal_versions' })
@Unique('UQ_proposal_versions_order', ['proposalId', 'orderIndex'])
export class ProposalVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposalId!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'tour_date', type: 'timestamptz', nullable: true })
  tourDate!: Date | null;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'itinerary_description', type: 'text', nullable: true })
  itineraryDescription!: string | null;

  @Column({
    name: 'price_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  priceAmount!: string;

  @Column({ name: 'price_currency', type: 'varchar', length: 10 })
  priceCurrency!: string;

  @Column({ type: 'jsonb', default: '[]' })
  included!: string[];

  @Column({ name: 'not_included', type: 'jsonb', default: '[]' })
  notIncluded!: string[];

  @Column({ name: 'cancellation_policy', type: 'text', nullable: true })
  cancellationPolicy!: string | null;

  @Column({ name: 'start_point', type: 'jsonb', nullable: true })
  startPoint!: Record<string, unknown> | null;

  @Column({ name: 'end_point', type: 'jsonb', nullable: true })
  endPoint!: Record<string, unknown> | null;

  @Column({ name: 'stripe_payment_link', type: 'varchar', length: 500, nullable: true })
  stripePaymentLink!: string | null;

  @ManyToOne(() => ProposalEntity, (proposal) => proposal.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proposal_id' })
  proposal!: ProposalEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
