import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHotelBookings1775737741748 implements MigrationInterface {
  name = 'CreateHotelBookings1775737741748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON TABLE "hotel_tours" IS 'Grants are revoked, never deleted, so booking history keeps its meaning.'
    `);

    await queryRunner.query(`
      CREATE TABLE "hotel_bookings" (
        "id"                       uuid NOT NULL DEFAULT gen_random_uuid(),
        "reference"                varchar(20) NOT NULL,
        "hotel_id"                 uuid NOT NULL,
        "tour_id"                  uuid NOT NULL,
        "tour_name_snapshot"       varchar(255) NOT NULL,
        "scheduled_for"            timestamptz NOT NULL,
        "language_code"            varchar(10) NOT NULL,
        "participant_count"        integer NOT NULL,
        "guest_name"               varchar(200) NOT NULL,
        "guest_email"              varchar(320),
        "guest_phone"              varchar(50),
        "room_number"              varchar(50),
        "notes"                    text,
        "status"                   varchar(20) NOT NULL DEFAULT 'pending',
        "currency"                 char(3) NOT NULL,
        "unit_price_amount"        numeric(10,2),
        "total_amount"             numeric(10,2),
        "cancellation_reason"      text,
        "confirmed_at"             timestamptz,
        "completed_at"             timestamptz,
        "cancelled_at"             timestamptz,
        "invoiced_at"              timestamptz,
        "created_by_hotel_user_id" uuid,
        "created_by_admin_user_id" uuid,
        "created_at"               timestamptz NOT NULL DEFAULT now(),
        "updated_at"               timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_hotel_bookings_reference" UNIQUE ("reference"),
        CONSTRAINT "CHK_hotel_bookings_participants" CHECK ("participant_count" > 0),
        CONSTRAINT "CHK_hotel_bookings_currency" CHECK ("currency" IN ('DKK')),
        CONSTRAINT "CHK_hotel_bookings_status" CHECK (
          "status" IN ('pending', 'confirmed', 'completed', 'cancelled', 'invoiced')
        ),
        CONSTRAINT "FK_hotel_bookings_hotel" FOREIGN KEY ("hotel_id")
          REFERENCES "hotels"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_hotel_bookings_tour" FOREIGN KEY ("tour_id")
          REFERENCES "tours"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_hotel_bookings_language" FOREIGN KEY ("language_code")
          REFERENCES "languages"("code") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_bookings"."unit_price_amount" IS
        'Per-person tour price when the booking was made, excluding VAT. Null when the tour has no price.'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_bookings"."total_amount" IS
        'Sum of the line items, excluding VAT. Stored, not derived, so an invoiced booking keeps what it was billed.'
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_bookings_hotel" ON "hotel_bookings" ("hotel_id", "scheduled_for" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_bookings_status" ON "hotel_bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_bookings_tour" ON "hotel_bookings" ("tour_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "hotel_booking_line_items" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id"  uuid NOT NULL,
        "kind"        varchar(20) NOT NULL,
        "description" varchar(200) NOT NULL,
        "amount"      numeric(10,2) NOT NULL,
        "order_index" integer NOT NULL,
        "created_by"  uuid,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_booking_line_items" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_hotel_booking_line_items_kind" CHECK ("kind" IN ('base', 'extra')),
        CONSTRAINT "FK_hotel_booking_line_items_booking" FOREIGN KEY ("booking_id")
          REFERENCES "hotel_bookings"("id") ON DELETE CASCADE
      )
    `);

    // A booking has at most one base line: the tour itself.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_hotel_booking_line_items_base"
        ON "hotel_booking_line_items" ("booking_id")
        WHERE "kind" = 'base'
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_booking_line_items_booking" ON "hotel_booking_line_items" ("booking_id", "order_index")`,
    );

    await queryRunner.query(`
      CREATE TABLE "hotel_booking_logs" (
        "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
        "booking_id"          uuid NOT NULL,
        "type"                varchar(30) NOT NULL,
        "from_status"         varchar(20),
        "to_status"           varchar(20),
        "actor_type"          varchar(20) NOT NULL,
        "actor_hotel_user_id" uuid,
        "actor_admin_user_id" uuid,
        "actor_label"         varchar(320) NOT NULL,
        "reason"              text,
        "metadata"            jsonb,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_booking_logs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_hotel_booking_logs_actor" CHECK ("actor_type" IN ('hotel', 'admin')),
        CONSTRAINT "FK_hotel_booking_logs_booking" FOREIGN KEY ("booking_id")
          REFERENCES "hotel_bookings"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_hotel_booking_logs_booking" ON "hotel_booking_logs" ("booking_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "hotel_booking_logs"`);
    await queryRunner.query(`DROP TABLE "hotel_booking_line_items"`);
    await queryRunner.query(`DROP TABLE "hotel_bookings"`);
    await queryRunner.query(`COMMENT ON TABLE "hotel_tours" IS NULL`);
  }
}
