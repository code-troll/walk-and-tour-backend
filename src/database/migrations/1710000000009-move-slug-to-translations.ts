import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveSlugToTranslations1710000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Tours ---
    await queryRunner.query(
      `ALTER TABLE "tour_translations" ADD "slug" character varying(150)`,
    );

    await queryRunner.query(
      `UPDATE "tour_translations" SET "slug" = "tour_translations"."language_code" || '-' || "tours"."slug" FROM "tours" WHERE "tour_translations"."tour_id" = "tours"."id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tour_translations" ALTER COLUMN "slug" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "tour_translations" ADD CONSTRAINT "UQ_tour_translations_slug" UNIQUE ("slug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "tours" DROP CONSTRAINT "UQ_tours_slug"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tours" DROP COLUMN "slug"`,
    );

    // --- Blog Posts ---
    await queryRunner.query(
      `ALTER TABLE "blog_post_translations" ADD "slug" character varying(150)`,
    );

    await queryRunner.query(
      `UPDATE "blog_post_translations"
       SET "slug" = "blog_post_translations"."language_code" || '-' || "blog_posts"."slug" FROM "blog_posts"
       WHERE "blog_post_translations"."blog_post_id" = "blog_posts"."id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_post_translations" ALTER COLUMN "slug" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_post_translations" ADD CONSTRAINT "UQ_blog_post_translations_slug" UNIQUE ("slug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP CONSTRAINT "UQ_blog_posts_slug"`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP COLUMN "slug"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --- Blog Posts (reverse) ---
    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD "slug" character varying(150)`,
    );

    await queryRunner.query(
      `UPDATE "blog_posts" SET "slug" = "sub"."slug" FROM (
        SELECT DISTINCT ON ("blog_post_id") "blog_post_id", "slug"
        FROM "blog_post_translations"
        ORDER BY "blog_post_id", "language_code" ASC
      ) "sub" WHERE "blog_posts"."id" = "sub"."blog_post_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_posts" ALTER COLUMN "slug" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_posts" ADD CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_post_translations" DROP CONSTRAINT "UQ_blog_post_translations_slug"`,
    );

    await queryRunner.query(
      `ALTER TABLE "blog_post_translations" DROP COLUMN "slug"`,
    );

    // --- Tours (reverse) ---
    await queryRunner.query(
      `ALTER TABLE "tours" ADD "slug" character varying(150)`,
    );

    await queryRunner.query(
      `UPDATE "tours" SET "slug" = "sub"."slug" FROM (
        SELECT DISTINCT ON ("tour_id") "tour_id", "slug"
        FROM "tour_translations"
        ORDER BY "tour_id", "language_code" ASC
      ) "sub" WHERE "tours"."id" = "sub"."tour_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tours" ALTER COLUMN "slug" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "tours" ADD CONSTRAINT "UQ_tours_slug" UNIQUE ("slug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "tour_translations" DROP CONSTRAINT "UQ_tour_translations_slug"`,
    );

    await queryRunner.query(
      `ALTER TABLE "tour_translations" DROP COLUMN "slug"`,
    );
  }
}
