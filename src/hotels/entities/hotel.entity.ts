import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { HotelTourEntity } from './hotel-tour.entity';

/**
 * A hotel that sells Walk and Tour tours to its guests.
 *
 * `email` is the hotel's contact address, used for correspondence about the
 * account itself. It is deliberately separate from the address the hotel's
 * access user signs in with, which arrives in a later slice: Auth0 requires a
 * unique email per connection, and the address that receives invoices is not
 * always the one that owns the login.
 */
@Entity({ name: 'hotels' })
export class HotelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 500 })
  address!: string;

  @Column({ type: 'varchar', length: 50 })
  phone!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  /** Danish company registration number. Unique across hotels. */
  @Column({ type: 'varchar', length: 20 })
  cvr!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @OneToMany(() => HotelTourEntity, (hotelTour) => hotelTour.hotel, {
    cascade: false,
  })
  tourGrants!: HotelTourEntity[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
