import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourDateToTimestamptz1710000000015 implements MigrationInterface {
  name = 'TourDateToTimestamptz1710000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE timestamptz USING "tour_date"::timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE date USING "tour_date"::date`,
    );
  }
}
