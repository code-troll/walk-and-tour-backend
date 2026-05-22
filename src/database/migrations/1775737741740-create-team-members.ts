import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamMembers1775737741740 implements MigrationInterface {
  name = 'CreateTeamMembers1775737741740';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team_members" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_index"     integer NOT NULL,
        "photo_media_id"  uuid,
        "linkedin_url"    varchar(500),
        "is_published"    boolean NOT NULL DEFAULT false,
        "created_by"      uuid,
        "updated_by"      uuid,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_members_order_index" UNIQUE ("order_index"),
        CONSTRAINT "FK_team_members_photo_media" FOREIGN KEY ("photo_media_id")
          REFERENCES "media_assets"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "team_member_translations" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "team_member_id"  uuid NOT NULL,
        "language_code"   varchar(10) NOT NULL,
        "name"            varchar(255) NOT NULL,
        "role"            varchar(255) NOT NULL,
        "image_alt"       varchar(255),
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_member_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_team_member_translation_locale" UNIQUE ("team_member_id", "language_code"),
        CONSTRAINT "FK_team_member_translations_member" FOREIGN KEY ("team_member_id")
          REFERENCES "team_members"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_team_member_translations_language" FOREIGN KEY ("language_code")
          REFERENCES "languages"("code") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "team_member_translations"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
  }
}
