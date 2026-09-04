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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hotel_tours" DROP COLUMN "price_amount"
    `);
  }
}
