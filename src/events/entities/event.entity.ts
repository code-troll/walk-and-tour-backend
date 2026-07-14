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
import { EventOccurrenceEntity } from './event-occurrence.entity';

/**
 * An event template / series. For `single` events `startDate` + `durationMinutes`
 * fully describe the one occurrence. For `recurring` events the `recurrence*`
 * columns describe a rule that produces candidate dates; each candidate becomes
 * a concrete {@link EventOccurrenceEntity} only once an admin confirms it.
 */
@Entity({ name: 'events' })
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 10 })
  language!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: string;

  @Column({ name: 'tour_id', type: 'uuid', nullable: true })
  tourId!: string | null;

  @ManyToOne(() => TourEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tour_id' })
  tour!: TourEntity | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'duration_minutes', type: 'integer' })
  durationMinutes!: number;

  @Column({ type: 'varchar', length: 20 })
  frequency!: string;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate!: Date;

  /**
   * IANA timezone the event is presented in (e.g. `Europe/Copenhagen`). All
   * datetimes above are stored in UTC; this only tells a viewer how to label
   * them. Defaults to the configured `DEFAULT_EVENT_TIMEZONE` on create.
   */
  @Column({ type: 'varchar', length: 64 })
  timezone!: string;

  @Column({ name: 'recurrence_freq', type: 'varchar', length: 10, nullable: true })
  recurrenceFreq!: string | null;

  @Column({ name: 'recurrence_interval', type: 'integer', nullable: true })
  recurrenceInterval!: number | null;

  @Column({ name: 'recurrence_by_day', type: 'jsonb', nullable: true })
  recurrenceByDay!: number[] | null;

  @Column({ name: 'recurrence_until', type: 'timestamptz', nullable: true })
  recurrenceUntil!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @OneToMany(() => EventOccurrenceEntity, (occurrence) => occurrence.event, {
    cascade: false,
  })
  occurrences!: EventOccurrenceEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
