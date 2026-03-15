import { MigrationInterface, QueryRunner } from 'typeorm';

const SUPER_ADMIN_AUTH0_USER_ID = 'google-oauth2|115126832227190392506';
const SUPER_ADMIN_EMAIL = 'francoca87@gmail.com';
const SUPER_ADMIN_ROLE = 'super_admin';
const SUPER_ADMIN_STATUS = 'active';

export class RegisterProductionSuperAdmin1710000000005 implements MigrationInterface {
    name = 'RegisterProductionSuperAdmin1710000000005';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "admin_users" ("auth0_user_id", "email", "role_name", "status")
            SELECT '${SUPER_ADMIN_AUTH0_USER_ID}', '${SUPER_ADMIN_EMAIL}', '${SUPER_ADMIN_ROLE}', '${SUPER_ADMIN_STATUS}'
            WHERE EXISTS (
                SELECT 1
                FROM "roles"
                WHERE "name" = '${SUPER_ADMIN_ROLE}'
            )
              AND NOT EXISTS (
                SELECT 1
                FROM "admin_users"
                WHERE "auth0_user_id" = '${SUPER_ADMIN_AUTH0_USER_ID}'
                   OR "email" = '${SUPER_ADMIN_EMAIL}'
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "admin_users"
            WHERE "auth0_user_id" = '${SUPER_ADMIN_AUTH0_USER_ID}'
              AND "email" = '${SUPER_ADMIN_EMAIL}'
              AND "role_name" = '${SUPER_ADMIN_ROLE}'
              AND "status" = '${SUPER_ADMIN_STATUS}'
        `);
    }
}
