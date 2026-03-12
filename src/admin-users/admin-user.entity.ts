import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { RoleEntity } from './role.entity';

@Entity({ name: 'admin_users' })
@Unique('UQ_admin_users_email', ['email'])
@Unique('UQ_admin_users_auth0_user_id', ['auth0UserId'])
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'auth0_user_id', type: 'varchar', length: 255, nullable: true })
  auth0UserId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'role_name', type: 'varchar', length: 50 })
  roleName!: string;

  @ManyToOne(() => RoleEntity, (role) => role.adminUsers, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'role_name', referencedColumnName: 'name' })
  role!: RoleEntity;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;
}
