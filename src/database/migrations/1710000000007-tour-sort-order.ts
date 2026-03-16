import { MigrationInterface, QueryRunner } from 'typeorm';

export class TourSortOrder1710000000007 implements MigrationInterface {
    name = 'TourSortOrder1710000000007';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "tours"
                ADD COLUMN "sort_order" integer
        `);
        await queryRunner.query(`
            WITH ranked_tours AS (
                SELECT "id",
                       ROW_NUMBER() OVER (
                           ORDER BY "updated_at" DESC, "created_at" DESC, "id" ASC
                       ) - 1 AS "sort_order"
                FROM "tours"
            )
            UPDATE "tours" AS "tour"
            SET "sort_order" = ranked_tours."sort_order"
            FROM ranked_tours
            WHERE ranked_tours."id" = "tour"."id"
        `);
        await queryRunner.query(`
            ALTER TABLE "tours"
                ALTER COLUMN "sort_order" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "tours"
                ADD CONSTRAINT "UQ_tours_sort_order" UNIQUE ("sort_order") DEFERRABLE INITIALLY IMMEDIATE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "tours"
                DROP CONSTRAINT "UQ_tours_sort_order"
        `);
        await queryRunner.query(`
            ALTER TABLE "tours"
                DROP COLUMN "sort_order"
        `);
    }
}
