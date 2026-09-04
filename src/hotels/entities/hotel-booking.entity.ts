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

import { TourEntity } from '../../tours/entities/tour.entity';
import { HotelBookingLineItemEntity } from './hotel-booking-line-item.entity';
import { HotelBookingLogEntity } from './hotel-booking-log.entity';
import { HotelEntity } from './hotel.entity';

/**
 * A tour a hotel has booked for its guests.
 *
 * Amounts are **exclusive of VAT** and denominated in `currency`, snapshotted
 * when the booking is made. A later change to the tour's price never rewrites a
 * booking that already quoted the old one.
 *
 * `totalAmount` is stored rather than derived on read, so an invoiced booking
 * keeps the figure it was billed at even if the line items were somehow to
 * change underneath it. It is recomputed in exactly one place, inside the same
 * transaction as any line-item change.
 */
@Entity({ name: 'hotel_bookings' })
export class HotelBookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Dictatable over the phone, e.g. `WT-2026-0042`. */
  @Column({ type: 'varchar', length: 20 })
  reference!: string;

  @Column({ name: 'hotel_id', type: 'uuid' })
  hotelId!: string;

  @ManyToOne(() => HotelEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: HotelEntity;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;

  /**
   * The tour name as it read when the booking was made. A tour can be renamed,
   * and the history should still say what was sold.
   */
  @Column({ name: 'tour_name_snapshot', type: 'varchar', length: 255 })
  tourNameSnapshot!: string;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor!: Date;

  @Column({ name: 'language_code', type: 'varchar', length: 10 })
  languageCode!: string;

  @Column({ name: 'participant_count', type: 'integer' })
  participantCount!: number;

  @Column({ name: 'guest_name', type: 'varchar', length: 200 })
  guestName!: string;

  @Column({ name: 'guest_email', type: 'varchar', length: 320, nullable: true })
  guestEmail!: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', length: 50, nullable: true })
  guestPhone!: string | null;

  @Column({ name: 'room_number', type: 'varchar', length: 50, nullable: true })
  roomNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  /**
   * The tour's per-person price when the booking was made, or null when the
   * tour has no price — a tip-based tour, where the amount is agreed later.
   */
  @Column({
    name: 'unit_price_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  unitPriceAmount!: string | null;

  /** Sum of the line items. Null while the booking has no priced base. */
  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalAmount!: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  /** Also the flag that freezes the money: set means the total is final. */
  @Column({ name: 'invoiced_at', type: 'timestamptz', nullable: true })
  invoicedAt!: Date | null;

  @Column({ name: 'created_by_hotel_user_id', type: 'uuid', nullable: true })
  createdByHotelUserId!: string | null;

  @Column({ name: 'created_by_admin_user_id', type: 'uuid', nullable: true })
  createdByAdminUserId!: string | null;

  @OneToMany(() => HotelBookingLineItemEntity, (lineItem) => lineItem.booking, {
    cascade: false,
  })
  lineItems!: HotelBookingLineItemEntity[];

  @OneToMany(() => HotelBookingLogEntity, (log) => log.booking, { cascade: false })
  logs!: HotelBookingLogEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
