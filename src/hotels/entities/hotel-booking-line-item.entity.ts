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
 * One priced line on a booking.
 *
 * The tour itself is a line item too, with `kind = 'base'`, so the total is the
 * sum of the lines under a single rule rather than a base column plus a pile of
 * adjustments. It also means the portal can show a booking as a line-by-line
 * quote, which is how a hotel reads it.
 *
 * `amount` may be negative, which is how a discount is expressed. It carries no
 * currency of its own: a booking is written in one currency, and a line that
 * could disagree with its booking would be a bug waiting to happen.
 */
@Entity({ name: 'hotel_booking_line_items' })
export class HotelBookingLineItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @ManyToOne(() => HotelBookingEntity, (booking) => booking.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: HotelBookingEntity;

  @Column({ type: 'varchar', length: 20 })
  kind!: string;

  @Column({ type: 'varchar', length: 200 })
  description!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount!: string;

  /** Keeps the base line first and later extras in the order they were added. */
  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
