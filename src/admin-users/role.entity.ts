import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AdminUserEntity } from './admin-user.entity';

@Entity({ name: 'roles' })
export class RoleEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'jsonb', default: [] })
  permissions!: string[];

  @OneToMany(() => AdminUserEntity, (adminUser) => adminUser.role)
  adminUsers!: AdminUserEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
