import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TourEntity } from '../../tours/entities/tour.entity';
import { HotelEntity } from './hotel.entity';

/**
 * A grant that lets one hotel sell one tour.
 *
 * Grants are revoked rather than deleted. Which tours a hotel was allowed to
 * sell, and when that changed, is the kind of thing that gets disputed later,
 * and a row that is deleted cannot answer the question. A revoked grant keeps
 * its history and a tour can be granted again afterwards, so the uniqueness
 * rule only covers the grants that are still live.
 */
@Entity({ name: 'hotel_tours' })
export class HotelTourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'hotel_id', type: 'uuid' })
  hotelId!: string;

  @ManyToOne(() => HotelEntity, (hotel) => hotel.tourGrants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: HotelEntity;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt!: Date;

  /**
   * What this tour costs this partner, per person.
   *
   * Null is not "free" and not "unknown": it means the grant has no opinion and
   * the tour's own price applies. That is the difference between a default and
   * a copy — a copy taken at grant time would silently stop following the tour,
   * and a partner on the standard price would drift away from it the first time
   * the tour was repriced without anyone touching the hotel.
   *
   * The currency is deliberately not here. It comes from the tour, so a grant
   * cannot quote a partner in a currency the tour is not sold in.
   */
  @Column({
    name: 'price_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  priceAmount!: string | null;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy!: string | null;

  /** Null while the grant is live. Set when the tour is taken away again. */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy!: string | null;
}
