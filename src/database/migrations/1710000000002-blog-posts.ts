import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlogPosts1710000000002 implements MigrationInterface {
    name = 'BlogPosts1710000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "blog_posts"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "slug"               character varying(150) NOT NULL,
                "name"               character varying(255) NOT NULL,
                "hero_media_ref"     character varying(255),
                "publication_status" character varying(20)  NOT NULL,
                "created_by" uuid,
                "updated_by" uuid,
                "published_by" uuid,
                "created_at"         TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at"         TIMESTAMP              NOT NULL DEFAULT now(),
                "published_at"       TIMESTAMP,
                CONSTRAINT "UQ_blog_posts_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_blog_posts_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "blog_post_translations"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "blog_post_id" uuid NOT NULL,
                "language_code"      character varying(10)  NOT NULL,
                "publication_status" character varying(20)  NOT NULL,
                "title"              character varying(255) NOT NULL,
                "summary"            text,
                "html_content"       text                   NOT NULL,
                "seo_title"          character varying(255),
                "seo_description"    text,
                "image_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "created_at"         TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at"         TIMESTAMP              NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_blog_post_translation_locale" UNIQUE ("blog_post_id", "language_code"),
                CONSTRAINT "PK_blog_post_translations_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "blog_post_tags"
            (
                "blog_post_id" uuid NOT NULL,
                "tag_key" character varying(100) NOT NULL,
                CONSTRAINT "PK_blog_post_tags" PRIMARY KEY ("blog_post_id", "tag_key")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "blog_post_translations"
                ADD CONSTRAINT "FK_blog_post_translations_blog_post"
                    FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "blog_post_translations"
                ADD CONSTRAINT "FK_blog_post_translations_language"
                    FOREIGN KEY ("language_code") REFERENCES "languages" ("code") ON DELETE RESTRICT
        `);
        await queryRunner.query(`
            ALTER TABLE "blog_post_tags"
                ADD CONSTRAINT "FK_blog_post_tags_blog_post"
                    FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "blog_post_tags"
                ADD CONSTRAINT "FK_blog_post_tags_tag"
                    FOREIGN KEY ("tag_key") REFERENCES "tags" ("key") ON DELETE RESTRICT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "blog_post_tags"
                DROP CONSTRAINT "FK_blog_post_tags_tag"`,
        );
        await queryRunner.query(
            `ALTER TABLE "blog_post_tags"
                DROP CONSTRAINT "FK_blog_post_tags_blog_post"`,
        );
        await queryRunner.query(
            `ALTER TABLE "blog_post_translations"
                DROP CONSTRAINT "FK_blog_post_translations_language"`,
        );
        await queryRunner.query(
            `ALTER TABLE "blog_post_translations"
                DROP CONSTRAINT "FK_blog_post_translations_blog_post"`,
        );
        await queryRunner.query(`DROP TABLE "blog_post_tags"`);
        await queryRunner.query(`DROP TABLE "blog_post_translations"`);
        await queryRunner.query(`DROP TABLE "blog_posts"`);
    }
}
