import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'newsletter_subscribers' })
@Unique('UQ_newsletter_subscribers_email', ['email'])
export class NewsletterSubscriberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'subscription_status', type: 'varchar', length: 30 })
  subscriptionStatus!: string;

  @Column({ name: 'preferred_locale', type: 'varchar', length: 10, nullable: true })
  preferredLocale!: string | null;

  @Column({ name: 'consent_source', type: 'varchar', length: 100, nullable: true })
  consentSource!: string | null;

  @Column({ name: 'source_metadata', type: 'jsonb', default: {} })
  sourceMetadata!: Record<string, unknown>;

  @Column({ name: 'consented_at', type: 'timestamp' })
  consentedAt!: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'unsubscribed_at', type: 'timestamp', nullable: true })
  unsubscribedAt!: Date | null;

  @Column({
    name: 'confirmation_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  confirmationTokenHash!: string | null;

  @Column({
    name: 'unsubscribe_token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  unsubscribeTokenHash!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
