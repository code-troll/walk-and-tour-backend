import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlogPostViewCount1710000000008 implements MigrationInterface {
  name = 'BlogPostViewCount1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      ADD COLUMN "view_count" integer NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE "blog_post_views"
      (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "blog_post_translation_id" uuid NOT NULL,
        "viewer_hash" character varying(64) NOT NULL,
        "last_viewed_at" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_blog_post_views_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_blog_post_views_translation_viewer" UNIQUE ("blog_post_translation_id", "viewer_hash")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_post_views"
      ADD CONSTRAINT "FK_blog_post_views_blog_post_translation"
      FOREIGN KEY ("blog_post_translation_id") REFERENCES "blog_post_translations" ("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "blog_post_views"
      DROP CONSTRAINT "FK_blog_post_views_blog_post_translation"
    `);

    await queryRunner.query(`
      DROP TABLE "blog_post_views"
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      DROP COLUMN "view_count"
    `);
  }
}
