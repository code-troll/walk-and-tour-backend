import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTourBookingWidget1775737741752 implements MigrationInterface {
  name = 'AddTourBookingWidget1775737741752';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tours"
        ADD COLUMN "booking_provider" varchar(30) NULL,
        ADD COLUMN "booking_enabled" boolean NOT NULL DEFAULT false,
        ADD CONSTRAINT "CHK_tours_booking_provider" CHECK ("booking_provider" IN ('turitop')),
        ADD CONSTRAINT "CHK_tours_booking_enabled_provider" CHECK (NOT "booking_enabled" OR "booking_provider" IS NOT NULL)
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "tours"."booking_provider" IS
        'Booking widget the public tour page embeds. Kept while booking_enabled is false, so the widget can be switched back on as it was.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "tours"."booking_enabled" IS
        'Whether the public page shows the booking widget. When false, or when a locale has no booking_reference_id, the page shows the booking-request form.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "tour_translations"."booking_reference_id" IS
        'The booking provider''s product id for this locale, such as a Turitop service code (P7).'
    `);

    // Until now the frontend embedded Turitop for every translation with a
    // booking reference, so those tours keep their widget.
    await queryRunner.query(`
      UPDATE "tours"
      SET "booking_provider" = 'turitop',
          "booking_enabled" = true
      WHERE EXISTS (
        SELECT 1
        FROM "tour_translations"
        WHERE "tour_translations"."tour_id" = "tours"."id"
          AND NULLIF(btrim("tour_translations"."booking_reference_id"), '') IS NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON COLUMN "tour_translations"."booking_reference_id" IS NULL
    `);

    // Destructive: which tours had the widget switched off is lost.
    await queryRunner.query(`
      ALTER TABLE "tours"
        DROP COLUMN "booking_enabled",
        DROP COLUMN "booking_provider"
    `);
  }
}
