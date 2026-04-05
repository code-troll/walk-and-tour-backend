import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourDateToTimestamp1710000000016 implements MigrationInterface {
  name = 'TourDateToTimestamp1710000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE timestamp without time zone USING "tour_date"::timestamp without time zone`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE timestamptz USING "tour_date"::timestamptz`,
    );
  }
}
