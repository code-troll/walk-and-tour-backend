import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotelTourPrice1775737741749 implements MigrationInterface {
  name = 'AddHotelTourPrice1775737741749';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hotel_tours" ADD COLUMN "price_amount" numeric(10,2)
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_tours"."price_amount" IS
        'Price per person for this partner. NULL means the tour''s own price applies, so a partner on the standard rate follows it when the tour is repriced.'
    `);

    // Existing grants keep the tour's price, which is what NULL already means.
    // There is deliberately no backfill: writing today's tour price into every
    // row would freeze each partner at this moment's rate.

    // A booking now takes the currency of the tour it is for, and tours are
    // priced in EUR as well as DKK. The check constraint allowed one value, so
    // widening the TypeScript allowlist alone produced a 500 on insert — which
    // only an end-to-end booking could show.
    await queryRunner.query(`
      ALTER TABLE "hotel_bookings" DROP CONSTRAINT "CHK_hotel_bookings_currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "hotel_bookings"
        ADD CONSTRAINT "CHK_hotel_bookings_currency" CHECK ("currency" IN ('DKK', 'EUR'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Narrowing the constraint back would fail against any EUR booking written
    // while it was open, so this deletes them. That is correct for a revert of
    // this migration — those bookings could not have existed before it — but it
    // is destructive, and saying so is the point of this comment.
    await queryRunner.query(`
      DELETE FROM "hotel_bookings" WHERE "currency" <> 'DKK'
    `);

    await queryRunner.query(`
      ALTER TABLE "hotel_bookings" DROP CONSTRAINT "CHK_hotel_bookings_currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "hotel_bookings"
        ADD CONSTRAINT "CHK_hotel_bookings_currency" CHECK ("currency" = 'DKK')
    `);

    await queryRunner.query(`
      ALTER TABLE "hotel_tours" DROP COLUMN "price_amount"
    `);
  }
}
