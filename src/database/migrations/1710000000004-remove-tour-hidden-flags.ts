import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTourHiddenFlags1710000000004 implements MigrationInterface {
  name = 'RemoveTourHiddenFlags1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tour_translations" DROP COLUMN "is_hidden"`);
    await queryRunner.query(`ALTER TABLE "tours" DROP COLUMN "is_hidden"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tours" ADD COLUMN "is_hidden" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tour_translations" ADD COLUMN "is_hidden" boolean NOT NULL DEFAULT false`,
    );
  }
}
