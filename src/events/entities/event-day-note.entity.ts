import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A free-text note attached to an entire calendar day (independent of any event).
 * Lets admins record meaningful reminders visible on the calendar. One note per
 * date — upserting a date replaces its note.
 */
@Entity({ name: 'event_day_notes' })
@Unique('UQ_event_day_note_date', ['noteDate'])
export class EventDayNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Calendar date `YYYY-MM-DD` the note applies to. */
  @Column({ name: 'note_date', type: 'date' })
  noteDate!: string;

  @Column({ type: 'text' })
  note!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
