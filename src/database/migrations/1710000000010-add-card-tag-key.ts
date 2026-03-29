import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCardTagKey1710000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tours" ADD "card_tag_key" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tours" DROP COLUMN "card_tag_key"`,
    );
  }
}
