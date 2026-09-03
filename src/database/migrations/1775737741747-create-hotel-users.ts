import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotelUsers1775737741747 implements MigrationInterface {
  name = 'CreateHotelUsers1775737741747';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hotel_users" (
        "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
        "hotel_id"         uuid NOT NULL,
        "username"         varchar(64) NOT NULL,
        "email"            varchar(320) NOT NULL,
        "identity_user_id" varchar(255),
        "status"           varchar(20) NOT NULL DEFAULT 'invited',
        "last_login_at"    timestamptz,
        "created_by"       uuid,
        "updated_by"       uuid,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hotel_users_hotel" UNIQUE ("hotel_id"),
        CONSTRAINT "UQ_hotel_users_username" UNIQUE ("username"),
        CONSTRAINT "UQ_hotel_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_hotel_users_identity" UNIQUE ("identity_user_id"),
        CONSTRAINT "FK_hotel_users_hotel" FOREIGN KEY ("hotel_id")
          REFERENCES "hotels"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hotel_users"`);
  }
}
