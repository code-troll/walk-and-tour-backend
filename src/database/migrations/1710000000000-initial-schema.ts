import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
    name = 'InitialSchema1710000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        await queryRunner.query(`
            CREATE TABLE "languages"
            (
                "code"       character varying(10)  NOT NULL,
                "name"       character varying(100) NOT NULL,
                "is_enabled" boolean                NOT NULL DEFAULT true,
                "sort_order" integer                NOT NULL,
                "created_at" TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP              NOT NULL DEFAULT now(),
                CONSTRAINT "PK_languages_code" PRIMARY KEY ("code")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tags"
            (
                "key"        character varying(100) NOT NULL,
                "labels" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "created_at" TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP              NOT NULL DEFAULT now(),
                CONSTRAINT "PK_tags_key" PRIMARY KEY ("key")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tours"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "slug"              character varying(150) NOT NULL,
                "name"              character varying(255) NOT NULL,
                "cover_media_id" uuid,
                "content_schema" jsonb,
                "price_amount"      numeric(10, 2),
                "price_currency"    character varying(10),
                "rating"            numeric(3, 2),
                "review_count"      integer,
                "tour_type"         character varying(20)  NOT NULL,
                "duration_minutes"  integer,
                "start_point" jsonb,
                "end_point" jsonb,
                "itinerary_variant" character varying(20),
                "created_by" uuid,
                "updated_by" uuid,
                "created_at"        TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at"        TIMESTAMP              NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tours_slug" UNIQUE ("slug"),
                CONSTRAINT "PK_tours_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "media_assets"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "media_type" character varying(20) NOT NULL,
                "storage_path" character varying(255) NOT NULL,
                "content_type" character varying(100) NOT NULL,
                "size" integer NOT NULL,
                "original_filename" character varying(255) NOT NULL,
                "created_by" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_media_assets_storage_path" UNIQUE ("storage_path"),
                CONSTRAINT "PK_media_assets_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tour_itinerary_stops"
            (
                "row_id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "tour_id" uuid NOT NULL,
                "stop_id"          character varying(100) NOT NULL,
                "order_index"      integer                NOT NULL,
                "duration_minutes" integer,
                "coordinates" jsonb,
                "next_connection" jsonb,
                CONSTRAINT "UQ_tour_stop_id" UNIQUE ("tour_id", "stop_id"),
                CONSTRAINT "UQ_tour_stop_order" UNIQUE ("tour_id", "order_index"),
                CONSTRAINT "PK_tour_itinerary_stops_row_id" PRIMARY KEY ("row_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tour_translations"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "tour_id" uuid NOT NULL,
                "language_code"        character varying(10) NOT NULL,
                "is_ready"             boolean               NOT NULL DEFAULT false,
                "is_published"         boolean               NOT NULL DEFAULT false,
                "booking_reference_id" character varying(255),
                "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "created_at"           TIMESTAMP             NOT NULL DEFAULT now(),
                "updated_at"           TIMESTAMP             NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tour_translation_locale" UNIQUE ("tour_id", "language_code"),
                CONSTRAINT "PK_tour_translations_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tour_media"
            (
                "row_id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "tour_id" uuid NOT NULL,
                "media_id" uuid NOT NULL,
                "order_index" integer NOT NULL,
                "alt_text" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_tour_media_attachment" UNIQUE ("tour_id", "media_id"),
                CONSTRAINT "UQ_tour_media_order" UNIQUE ("tour_id", "order_index"),
                CONSTRAINT "PK_tour_media_row_id" PRIMARY KEY ("row_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "tour_tags"
            (
                "tour_id" uuid NOT NULL,
                "tag_key" character varying(100) NOT NULL,
                CONSTRAINT "PK_tour_tags" PRIMARY KEY ("tour_id", "tag_key")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "tours"
                ADD CONSTRAINT "FK_tours_cover_media"
                    FOREIGN KEY ("cover_media_id") REFERENCES "media_assets" ("id") ON DELETE RESTRICT
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_itinerary_stops"
                ADD CONSTRAINT "FK_tour_itinerary_stops_tour"
                    FOREIGN KEY ("tour_id") REFERENCES "tours" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_translations"
                ADD CONSTRAINT "FK_tour_translations_tour"
                    FOREIGN KEY ("tour_id") REFERENCES "tours" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_translations"
                ADD CONSTRAINT "FK_tour_translations_language"
                    FOREIGN KEY ("language_code") REFERENCES "languages" ("code") ON DELETE RESTRICT
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_media"
                ADD CONSTRAINT "FK_tour_media_tour"
                    FOREIGN KEY ("tour_id") REFERENCES "tours" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_media"
                ADD CONSTRAINT "FK_tour_media_media"
                    FOREIGN KEY ("media_id") REFERENCES "media_assets" ("id") ON DELETE RESTRICT
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_tags"
                ADD CONSTRAINT "FK_tour_tags_tour"
                    FOREIGN KEY ("tour_id") REFERENCES "tours" ("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "tour_tags"
                ADD CONSTRAINT "FK_tour_tags_tag"
                    FOREIGN KEY ("tag_key") REFERENCES "tags" ("key") ON DELETE RESTRICT
        `);
        await queryRunner.query(`
            INSERT INTO "languages" ("code", "name", "is_enabled", "sort_order")
            VALUES ('en', 'English', true, 1),
                   ('es', 'Spanish', true, 2),
                   ('it', 'Italian', true, 3)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tour_tags"
            DROP CONSTRAINT "FK_tour_tags_tag"`);
        await queryRunner.query(`ALTER TABLE "tour_tags"
            DROP CONSTRAINT "FK_tour_tags_tour"`);
        await queryRunner.query(`ALTER TABLE "tour_media"
            DROP CONSTRAINT "FK_tour_media_media"`);
        await queryRunner.query(`ALTER TABLE "tour_media"
            DROP CONSTRAINT "FK_tour_media_tour"`);
        await queryRunner.query(
            `ALTER TABLE "tour_translations"
                DROP CONSTRAINT "FK_tour_translations_language"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tour_translations"
                DROP CONSTRAINT "FK_tour_translations_tour"`,
        );
        await queryRunner.query(
            `ALTER TABLE "tour_itinerary_stops"
                DROP CONSTRAINT "FK_tour_itinerary_stops_tour"`,
        );
        await queryRunner.query(`ALTER TABLE "tours"
            DROP CONSTRAINT "FK_tours_cover_media"`);
        await queryRunner.query(`DROP TABLE "tour_tags"`);
        await queryRunner.query(`DROP TABLE "tour_media"`);
        await queryRunner.query(`DROP TABLE "tour_translations"`);
        await queryRunner.query(`DROP TABLE "tour_itinerary_stops"`);
        await queryRunner.query(`DROP TABLE "media_assets"`);
        await queryRunner.query(`DROP TABLE "tours"`);
        await queryRunner.query(`DROP TABLE "tags"`);
        await queryRunner.query(`DROP TABLE "languages"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "pgcrypto"`);
    }
}
