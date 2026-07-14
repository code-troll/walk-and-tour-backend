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
 * A specific calendar date range during which the team member is unavailable
 * (e.g. holidays / vacation). Both bounds are inclusive; a single day off is
 * stored with `startDate === endDate`.
 */
@Entity({ name: 'team_member_unavailable_dates' })
export class TeamMemberUnavailableDateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_member_id', type: 'uuid' })
  teamMemberId!: string;

  @ManyToOne(() => TeamMemberEntity, (member) => member.unavailableDates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_member_id' })
  teamMember!: TeamMemberEntity;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
