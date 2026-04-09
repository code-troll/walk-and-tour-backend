import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProposalName1775737741739 implements MigrationInterface {
  name = 'AddProposalName1775737741739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "proposals" ADD COLUMN "name" varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "proposals" DROP COLUMN "name"`);
  }
}
