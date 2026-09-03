import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotels1775737741746 implements MigrationInterface {
  name = 'CreateHotels1775737741746';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "hotels" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"       varchar(200) NOT NULL,
        "address"    varchar(500) NOT NULL,
        "phone"      varchar(50) NOT NULL,
        "email"      varchar(320) NOT NULL,
        "cvr"        varchar(20) NOT NULL,
        "status"     varchar(20) NOT NULL DEFAULT 'active',
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotels" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hotels_cvr" UNIQUE ("cvr")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hotels_name" ON "hotels" ("name")`,
    );

    await queryRunner.query(`
      CREATE TABLE "hotel_tours" (
        "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
        "hotel_id"   uuid NOT NULL,
        "tour_id"    uuid NOT NULL,
        "granted_at" timestamptz NOT NULL DEFAULT now(),
        "granted_by" uuid,
        "revoked_at" timestamptz,
        "revoked_by" uuid,
        CONSTRAINT "PK_hotel_tours" PRIMARY KEY ("id"),
        CONSTRAINT "FK_hotel_tours_hotel" FOREIGN KEY ("hotel_id")
          REFERENCES "hotels"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_hotel_tours_tour" FOREIGN KEY ("tour_id")
          REFERENCES "tours"("id") ON DELETE RESTRICT
      )
    `);

    // Grants are revoked, not deleted, so the same hotel/tour pair may appear
    // several times over its history. Only one of them may be live at a time.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_hotel_tours_live_grant"
        ON "hotel_tours" ("hotel_id", "tour_id")
        WHERE "revoked_at" IS NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_tours_tour" ON "hotel_tours" ("tour_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hotel_tours"`);
    await queryRunner.query(`DROP TABLE "hotels"`);
  }
}
