import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlogCardTagKey1710000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD "card_tag_key" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP COLUMN "card_tag_key"`,
    );
  }
}
