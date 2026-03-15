import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlogTranslationPublication1710000000004 implements MigrationInterface {
  name = 'BlogTranslationPublication1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      ADD COLUMN "is_published" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "blog_post_translations"
      SET "is_published" = CASE
        WHEN "publication_status" = 'published' THEN true
        ELSE false
      END
    `);

    await queryRunner.query(`
      UPDATE "blog_posts" AS "blog_post"
      SET "published_at" = COALESCE("blog_post"."published_at", "blog_post"."updated_at", "blog_post"."created_at")
      WHERE EXISTS (
        SELECT 1
        FROM "blog_post_translations" AS "translation"
        WHERE "translation"."blog_post_id" = "blog_post"."id"
          AND "translation"."is_published" = true
      )
    `);

    await queryRunner.query(`
      UPDATE "blog_posts" AS "blog_post"
      SET "published_at" = NULL
      WHERE NOT EXISTS (
        SELECT 1
        FROM "blog_post_translations" AS "translation"
        WHERE "translation"."blog_post_id" = "blog_post"."id"
          AND "translation"."is_published" = true
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      DROP COLUMN "publication_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      DROP COLUMN "publication_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      DROP COLUMN "published_by"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      ADD COLUMN "published_by" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      ADD COLUMN "publication_status" character varying(20) NOT NULL DEFAULT 'draft'
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      ADD COLUMN "publication_status" character varying(20) NOT NULL DEFAULT 'unpublished'
    `);

    await queryRunner.query(`
      UPDATE "blog_post_translations"
      SET "publication_status" = CASE
        WHEN "is_published" = true THEN 'published'
        ELSE 'unpublished'
      END
    `);

    await queryRunner.query(`
      UPDATE "blog_posts" AS "blog_post"
      SET "publication_status" = CASE
        WHEN EXISTS (
          SELECT 1
          FROM "blog_post_translations" AS "translation"
          WHERE "translation"."blog_post_id" = "blog_post"."id"
            AND "translation"."is_published" = true
        ) THEN 'published'
        ELSE 'draft'
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "blog_post_translations"
      DROP COLUMN "is_published"
    `);
  }
}
