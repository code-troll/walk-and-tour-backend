import { MigrationInterface, QueryRunner } from 'typeorm';

export class ArchiveHotels1775737741750 implements MigrationInterface {
  name = 'ArchiveHotels1775737741750';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A CVR is unique among the hotels Walk and Tour actually works with, not
    // among every row that ever existed. Archiving a hotel has to give the
    // number back, or re-registering the same company after a break is
    // impossible — which is most of the reason to archive one.
    await queryRunner.query(`
      ALTER TABLE "hotels" DROP CONSTRAINT "UQ_hotels_cvr"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_hotels_cvr_live"
        ON "hotels" ("cvr")
        WHERE "status" <> 'archived'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "hotels"."status" IS
        'active | disabled | archived. Archived releases the CVR and the access user; disabled releases neither.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restoring the table-wide constraint fails if two hotels share a CVR
    // because one of them was archived. That is a real conflict rather than a
    // migration fault: the revert cannot invent which one should keep it.
    await queryRunner.query(`
      DROP INDEX "UQ_hotels_cvr_live"
    `);

    await queryRunner.query(`
      ALTER TABLE "hotels" ADD CONSTRAINT "UQ_hotels_cvr" UNIQUE ("cvr")
    `);
  }
}
