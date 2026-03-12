import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { TourEntity } from './tour.entity';

@Entity({ name: 'tour_itinerary_stops' })
@Unique('UQ_tour_stop_id', ['tourId', 'stopId'])
@Unique('UQ_tour_stop_order', ['tourId', 'orderIndex'])
export class TourItineraryStopEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'row_id' })
  rowId!: string;

  @Column({ name: 'tour_id', type: 'uuid' })
  tourId!: string;

  @ManyToOne(() => TourEntity, (tour) => tour.stops, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity;

  @Column({ name: 'stop_id', type: 'varchar', length: 100 })
  stopId!: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex!: number;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  coordinates!: Record<string, number> | null;

  @Column({ name: 'next_connection', type: 'jsonb', nullable: true })
  nextConnection!: Record<string, unknown> | null;
}
