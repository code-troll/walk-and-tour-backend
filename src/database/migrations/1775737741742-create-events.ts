import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEvents1775737741742 implements MigrationInterface {
  name = 'CreateEvents1775737741742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
        "language"            varchar(10) NOT NULL,
        "type"                varchar(20) NOT NULL,
        "tour_id"             uuid,
        "description"         text,
        "duration_minutes"    integer NOT NULL,
        "frequency"           varchar(20) NOT NULL,
        "start_date"          timestamptz NOT NULL,
        "timezone"            varchar(64) NOT NULL DEFAULT 'Europe/Copenhagen',
        "recurrence_freq"     varchar(10),
        "recurrence_interval" integer,
        "recurrence_by_day"   jsonb,
        "recurrence_until"    timestamptz,
        "status"              varchar(20) NOT NULL DEFAULT 'active',
        "created_by"          uuid,
        "updated_by"          uuid,
        "created_at"          timestamptz NOT NULL DEFAULT now(),
        "updated_at"          timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_language" FOREIGN KEY ("language")
          REFERENCES "languages"("code") ON DELETE RESTRICT,
        CONSTRAINT "FK_events_tour" FOREIGN KEY ("tour_id")
          REFERENCES "tours"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_events_tour" ON "events" ("tour_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "event_occurrences" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_id"        uuid NOT NULL,
        "occurrence_date" timestamptz NOT NULL,
        "note"            text,
        "status"          varchar(20) NOT NULL DEFAULT 'confirmed',
        "created_by"      uuid,
        "updated_by"      uuid,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_occurrences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_occurrence_date" UNIQUE ("event_id", "occurrence_date"),
        CONSTRAINT "FK_event_occurrences_event" FOREIGN KEY ("event_id")
          REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "event_occurrence_team_members" (
        "occurrence_id"  uuid NOT NULL,
        "team_member_id" uuid NOT NULL,
        CONSTRAINT "PK_event_occurrence_team_members" PRIMARY KEY ("occurrence_id", "team_member_id"),
        CONSTRAINT "FK_event_occurrence_team_members_occurrence" FOREIGN KEY ("occurrence_id")
          REFERENCES "event_occurrences"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_occurrence_team_members_member" FOREIGN KEY ("team_member_id")
          REFERENCES "team_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_event_occurrence_team_members_member" ON "event_occurrence_team_members" ("team_member_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_occurrence_team_members"`);
    await queryRunner.query(`DROP TABLE "event_occurrences"`);
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
