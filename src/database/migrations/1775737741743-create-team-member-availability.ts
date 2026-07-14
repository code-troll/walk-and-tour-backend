import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamMemberAvailability1775737741743
  implements MigrationInterface
{
  name = 'CreateTeamMemberAvailability1775737741743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team_member_unavailable_dates" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "team_member_id"  uuid NOT NULL,
        "start_date"      date NOT NULL,
        "end_date"        date NOT NULL,
        "reason"          varchar(255),
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_member_unavailable_dates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_member_unavailable_dates_member" FOREIGN KEY ("team_member_id")
          REFERENCES "team_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_team_member_unavailable_dates_member" ON "team_member_unavailable_dates" ("team_member_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "team_member_recurring_unavailability" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "team_member_id"  uuid NOT NULL,
        "day_of_week"     smallint NOT NULL,
        "start_time"      time,
        "end_time"        time,
        "created_at"      timestamptz NOT NULL DEFAULT now(),
        "updated_at"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_team_member_recurring_unavailability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_member_recurring_unavailability_member" FOREIGN KEY ("team_member_id")
          REFERENCES "team_members"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_team_member_recurring_unavailability_member" ON "team_member_recurring_unavailability" ("team_member_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE "team_member_recurring_unavailability"`,
    );
    await queryRunner.query(`DROP TABLE "team_member_unavailable_dates"`);
  }
}
