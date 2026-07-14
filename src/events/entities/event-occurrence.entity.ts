import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { TeamMemberEntity } from '../../team-members/entities/team-member.entity';
import { EventEntity } from './event.entity';

/**
 * A confirmed concretion of an event on a specific date. Holds the guide(s)
 * assigned for that date and a per-occurrence free-text note. Candidate dates
 * of a recurring event exist only virtually (computed from the rule) until an
 * admin confirms one, which creates a row here.
 */
@Entity({ name: 'event_occurrences' })
@Unique('UQ_event_occurrence_date', ['eventId', 'occurrenceDate'])
export class EventOccurrenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => EventEntity, (event) => event.occurrences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  @Column({ name: 'occurrence_date', type: 'timestamptz' })
  occurrenceDate!: Date;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status!: string;

  @ManyToMany(() => TeamMemberEntity)
  @JoinTable({
    name: 'event_occurrence_team_members',
    joinColumn: { name: 'occurrence_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_member_id', referencedColumnName: 'id' },
  })
  teamMembers!: TeamMemberEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
