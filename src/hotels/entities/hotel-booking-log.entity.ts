import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { HotelBookingEntity } from './hotel-booking.entity';

/**
 * The audit trail a booking carries.
 *
 * `actorLabel` is denormalised on purpose. An admin user or a hotel user can be
 * removed later, and a history that cannot say who did something is not much of
 * a history. The identifiers are kept alongside it for the cases where the
 * actor still exists.
 *
 * `fromStatus` and `toStatus` are null for entries that are not transitions —
 * a line item added, details edited.
 */
@Entity({ name: 'hotel_booking_logs' })
export class HotelBookingLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => HotelBookingEntity, (booking) => booking.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: HotelBookingEntity;

  @Column({ type: 'varchar', length: 30 })
  type!: string;

  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true })
  fromStatus!: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 20, nullable: true })
  toStatus!: string | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 20 })
  actorType!: string;

  @Column({ name: 'actor_hotel_user_id', type: 'uuid', nullable: true })
  actorHotelUserId!: string | null;

  @Column({ name: 'actor_admin_user_id', type: 'uuid', nullable: true })
  actorAdminUserId!: string | null;

  @Column({ name: 'actor_label', type: 'varchar', length: 320 })
  actorLabel!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
