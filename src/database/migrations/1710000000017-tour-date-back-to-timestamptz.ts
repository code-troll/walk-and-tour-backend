import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourDateBackToTimestamptz1710000000017 implements MigrationInterface {
  name = 'TourDateBackToTimestamptz1710000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE timestamptz USING "tour_date"::timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "proposal_versions" ALTER COLUMN "tour_date" TYPE timestamp without time zone USING "tour_date"::timestamp without time zone`,
    );
  }
}
