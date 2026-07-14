import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventDayNotes1775737741744 implements MigrationInterface {
  name = 'CreateEventDayNotes1775737741744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_day_notes" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "note_date"   date NOT NULL,
        "note"        text NOT NULL,
        "created_by"  uuid,
        "updated_by"  uuid,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_day_notes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_day_note_date" UNIQUE ("note_date")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_day_notes"`);
  }
}
