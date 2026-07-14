import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TeamMemberEntity } from './team-member.entity';

/**
 * A recurring weekly window during which the team member is unavailable.
 * `dayOfWeek` follows JS `Date.getUTCDay()` convention (0 = Sunday … 6 = Saturday).
 * When both `startTime` and `endTime` are null the whole weekday is unavailable;
 * otherwise the unavailable window is `[startTime, endTime)` interpreted in UTC.
 */
@Entity({ name: 'team_member_recurring_unavailability' })
export class TeamMemberRecurringUnavailabilityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_member_id', type: 'uuid' })
  teamMemberId!: string;

  @ManyToOne(
    () => TeamMemberEntity,
    (member) => member.recurringUnavailability,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'team_member_id' })
  teamMember!: TeamMemberEntity;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
