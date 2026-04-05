import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProposalVersionDateDuration1710000000014 implements MigrationInterface {
  name = 'AddProposalVersionDateDuration1710000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "proposal_versions" ADD COLUMN "tour_date" date`);
    await queryRunner.query(`ALTER TABLE "proposal_versions" ADD COLUMN "duration_minutes" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "proposal_versions" DROP COLUMN "duration_minutes"`);
    await queryRunner.query(`ALTER TABLE "proposal_versions" DROP COLUMN "tour_date"`);
  }
}
