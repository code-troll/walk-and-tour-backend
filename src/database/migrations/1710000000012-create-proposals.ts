import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProposals1710000000012 implements MigrationInterface {
  name = 'CreateProposals1710000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "proposals"
      (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "hash"            varchar(24) NOT NULL,
        "language"        varchar(10) NOT NULL,
        "recipient_name"  varchar(255),
        "recipient_email" varchar(255),
        "status"          varchar(20) NOT NULL DEFAULT 'draft',
        "expires_at" timestamptz,
        "notes"           text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proposals" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_proposals_hash" UNIQUE ("hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "proposal_versions"
      (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "proposal_id" uuid NOT NULL,
        "order_index"           integer        NOT NULL,
        "title"                 varchar(255)   NOT NULL,
        "description"           text,
        "itinerary_description" text,
        "price_amount"          numeric(10, 2) NOT NULL,
        "price_currency"        varchar(10)    NOT NULL,
        "included" jsonb NOT NULL DEFAULT '[]',
        "not_included" jsonb NOT NULL DEFAULT '[]',
        "cancellation_policy"   text,
        "start_point" jsonb,
        "end_point" jsonb,
        "stripe_payment_link"   varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proposal_versions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_proposal_versions_order" UNIQUE ("proposal_id", "order_index"),
        CONSTRAINT "FK_proposal_versions_proposal" FOREIGN KEY ("proposal_id")
          REFERENCES "proposals" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "proposal_media"
      (
        "row_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "proposal_id" uuid NOT NULL,
        "media_id" uuid NOT NULL,
        "order_index" integer NOT NULL,
        "alt_text" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_proposal_media" PRIMARY KEY ("row_id"),
        CONSTRAINT "UQ_proposal_media_attachment" UNIQUE ("proposal_id", "media_id"),
        CONSTRAINT "UQ_proposal_media_order" UNIQUE ("proposal_id", "order_index"),
        CONSTRAINT "FK_proposal_media_proposal" FOREIGN KEY ("proposal_id")
          REFERENCES "proposals" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_proposal_media_asset" FOREIGN KEY ("media_id")
          REFERENCES "media_assets" ("id") ON DELETE RESTRICT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "proposal_media"`);
    await queryRunner.query(`DROP TABLE "proposal_versions"`);
    await queryRunner.query(`DROP TABLE "proposals"`);
  }
}
