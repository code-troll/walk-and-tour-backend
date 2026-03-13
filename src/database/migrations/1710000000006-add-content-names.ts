import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentNames1710000000006 implements MigrationInterface {
  name = 'AddContentNames1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tours"
      ADD COLUMN "name" character varying(255)
    `);
    await queryRunner.query(`
      UPDATE "tours"
      SET "name" = "slug"
      WHERE "name" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tours"
      ALTER COLUMN "name" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      ADD COLUMN "name" character varying(255)
    `);
    await queryRunner.query(`
      UPDATE "blog_posts"
      SET "name" = "slug"
      WHERE "name" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      ALTER COLUMN "name" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      DROP COLUMN "name"
    `);
    await queryRunner.query(`
      ALTER TABLE "tours"
      DROP COLUMN "name"
    `);
  }
}
