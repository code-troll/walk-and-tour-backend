import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminAuth1710000000001 implements MigrationInterface {
    name = 'AdminAuth1710000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "roles"
            (
                "name"        character varying(50)  NOT NULL,
                "description" character varying(255) NOT NULL,
                "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "created_at"  TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at"  TIMESTAMP              NOT NULL DEFAULT now(),
                CONSTRAINT "PK_roles_name" PRIMARY KEY ("name")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "admin_users"
            (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "auth0_user_id" character varying(255),
                "email"         character varying(255) NOT NULL,
                "role_name"     character varying(50)  NOT NULL,
                "status"        character varying(20)  NOT NULL,
                "created_at"    TIMESTAMP              NOT NULL DEFAULT now(),
                "updated_at"    TIMESTAMP              NOT NULL DEFAULT now(),
                "last_login_at" TIMESTAMP,
                CONSTRAINT "UQ_admin_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_admin_users_auth0_user_id" UNIQUE ("auth0_user_id"),
                CONSTRAINT "PK_admin_users_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "description", "permissions")
            VALUES ('super_admin',
                    'Full access to users, roles, content, languages, settings, and newsletter subscribers.',
                    '["admin_users:manage","roles:manage","languages:manage","tags:manage","tours:manage","blogs:manage","newsletter:manage"]'::jsonb),
                   ('editor', 'Can create, update, publish, and unpublish tours and blog posts.',
                    '["tags:manage","tours:manage","blogs:manage"]'::jsonb),
                   ('marketing', 'Can view and manage newsletter subscribers and supporting published content.',
                    '["newsletter:manage"]'::jsonb)
        `);
        await queryRunner.query(`
            ALTER TABLE "admin_users"
                ADD CONSTRAINT "FK_admin_users_role"
                    FOREIGN KEY ("role_name") REFERENCES "roles" ("name") ON DELETE RESTRICT
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_users"
            DROP CONSTRAINT "FK_admin_users_role"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}
