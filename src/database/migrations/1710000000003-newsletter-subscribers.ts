import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewsletterSubscribers1710000000003 implements MigrationInterface {
  name = 'NewsletterSubscribers1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "newsletter_subscribers"
      (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email"                   character varying(255) NOT NULL,
        "subscription_status"     character varying(30)  NOT NULL,
        "preferred_locale"        character varying(10),
        "consent_source"          character varying(100),
        "source_metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "consented_at"            TIMESTAMP              NOT NULL,
        "confirmed_at"            TIMESTAMP,
        "unsubscribed_at"         TIMESTAMP,
        "confirmation_token_hash" character varying(64),
        "unsubscribe_token_hash"  character varying(64),
        "created_at"              TIMESTAMP              NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP              NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_newsletter_subscribers_email" UNIQUE ("email"),
        CONSTRAINT "PK_newsletter_subscribers_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "newsletter_subscribers"
      ADD CONSTRAINT "CHK_newsletter_subscribers_status"
      CHECK ("subscription_status" IN ('pending_confirmation', 'subscribed', 'unsubscribed'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "newsletter_subscribers" DROP CONSTRAINT "CHK_newsletter_subscribers_status"`,
    );
    await queryRunner.query(`DROP TABLE "newsletter_subscribers"`);
  }
}
