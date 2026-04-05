import { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitProposalStatus1710000000013 implements MigrationInterface {
  name = 'SplitProposalStatus1710000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "proposals"
        ADD COLUMN "acceptance_status" varchar(20) NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      ALTER TABLE "proposals"
        ADD COLUMN "publication_status" varchar(20) NOT NULL DEFAULT 'unpublished'
    `);

    // Migrate existing data
    await queryRunner.query(`
      UPDATE "proposals" SET
        "acceptance_status" = CASE WHEN "status" = 'accepted' THEN 'accepted' ELSE 'pending' END,
        "publication_status" = CASE WHEN "status" = 'sent' THEN 'published' ELSE 'unpublished' END
    `);

    await queryRunner.query(`ALTER TABLE "proposals" DROP COLUMN "status"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "proposals"
        ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'draft'
    `);

    await queryRunner.query(`
      UPDATE "proposals" SET
        "status" = CASE
          WHEN "acceptance_status" = 'accepted' THEN 'accepted'
          WHEN "publication_status" = 'published' THEN 'sent'
          ELSE 'draft'
        END
    `);

    await queryRunner.query(`ALTER TABLE "proposals" DROP COLUMN "acceptance_status"`);
    await queryRunner.query(`ALTER TABLE "proposals" DROP COLUMN "publication_status"`);
  }
}
