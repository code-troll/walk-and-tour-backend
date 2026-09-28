import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTourPriceBasis1775737741751 implements MigrationInterface {
  name = 'AddTourPriceBasis1775737741751';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Every existing price was written and read as per person, so that is the
    // default. Some private tours are priced for the whole group in practice;
    // moving them is an editorial decision made in the admin, not a guess here.
    await queryRunner.query(`
      ALTER TABLE "tours"
        ADD COLUMN "price_basis" varchar(20) NOT NULL DEFAULT 'per_person',
        ADD CONSTRAINT "CHK_tours_price_basis" CHECK ("price_basis" IN ('per_person', 'per_group'))
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "tours"."price_basis" IS
        'Whether price_amount is charged per person or once for the whole group.'
    `);

    // Snapshotted beside unit_price_amount, so a tour changing basis later does
    // not change what an existing booking's price meant.
    await queryRunner.query(`
      ALTER TABLE "hotel_bookings"
        ADD COLUMN "price_basis" varchar(20) NOT NULL DEFAULT 'per_person',
        ADD CONSTRAINT "CHK_hotel_bookings_price_basis" CHECK ("price_basis" IN ('per_person', 'per_group'))
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_bookings"."unit_price_amount" IS
        'Tour price when the booking was made, excluding VAT, per person or per group as price_basis says. Null when the tour has no price.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_tours"."price_amount" IS
        'Price for this partner, on the tour''s own price basis. NULL means the tour''s own price applies, so a partner on the standard rate follows it when the tour is repriced.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_tours"."price_amount" IS
        'Price per person for this partner. NULL means the tour''s own price applies, so a partner on the standard rate follows it when the tour is repriced.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotel_bookings"."unit_price_amount" IS
        'Per-person tour price when the booking was made, excluding VAT. Null when the tour has no price.'
    `);

    await queryRunner.query(`
      ALTER TABLE "hotel_bookings" DROP COLUMN "price_basis"
    `);

    await queryRunner.query(`
      ALTER TABLE "tours" DROP COLUMN "price_basis"
    `);
  }
}
