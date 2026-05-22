import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorTeamMembersSchema1775737741741 implements MigrationInterface {
  name = 'RefactorTeamMembersSchema1775737741741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Move name and image_alt from translations to the base table
    await queryRunner.query(`ALTER TABLE "team_members" ADD COLUMN "name" varchar(255) NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "team_members" ADD COLUMN "image_alt" varchar(255)`);

    // Make photo_media_id required
    await queryRunner.query(`ALTER TABLE "team_members" ALTER COLUMN "photo_media_id" SET NOT NULL`);

    // Remove name and image_alt from translations (only role remains localizable)
    await queryRunner.query(`ALTER TABLE "team_member_translations" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "team_member_translations" DROP COLUMN "image_alt"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "team_member_translations" ADD COLUMN "image_alt" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "team_member_translations" ADD COLUMN "name" varchar(255) NOT NULL DEFAULT ''`);

    await queryRunner.query(`ALTER TABLE "team_members" ALTER COLUMN "photo_media_id" DROP NOT NULL`);

    await queryRunner.query(`ALTER TABLE "team_members" DROP COLUMN "image_alt"`);
    await queryRunner.query(`ALTER TABLE "team_members" DROP COLUMN "name"`);
  }
}
