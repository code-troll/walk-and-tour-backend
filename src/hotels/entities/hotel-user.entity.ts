import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { HotelEntity } from './hotel.entity';

/**
 * The single access user a hotel signs in with.
 *
 * `email` is the sign-in address and is deliberately separate from the hotel's
 * contact address: the identity provider enforces a unique email per
 * connection, and the address that receives invoices is not always the one that
 * owns the login.
 *
 * `identityUserId` is recorded when the identity is created, so a token is
 * always resolved by subject. There is no lookup by email — that shortcut is
 * what would let an identity from another connection claim this account.
 */
@Entity({ name: 'hotel_users' })
export class HotelUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'hotel_id', type: 'uuid' })
  hotelId!: string;

  @OneToOne(() => HotelEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel!: HotelEntity;

  @Column({ type: 'varchar', length: 64 })
  username!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ name: 'identity_user_id', type: 'varchar', length: 255, nullable: true })
  identityUserId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'invited' })
  status!: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
