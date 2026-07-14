import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reflects team-member and event/calendar management (both `super_admin` and
 * `editor`) in the descriptive role metadata shown in the admin `/users` legend.
 * These permission strings are descriptive only — access is enforced by the
 * `@AdminRoles(...)` role-name guard, not by this list.
 */
export class UpdateRolePermissionsForEvents1775737741745
  implements MigrationInterface
{
  name = 'UpdateRolePermissionsForEvents1775737741745';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles"
      SET "description" = 'Full access to users, roles, content, team members, events and the calendar, languages, settings, and newsletter subscribers.',
          "permissions" = '["admin_users:manage","roles:manage","languages:manage","tags:manage","tours:manage","blogs:manage","team_members:manage","events:manage","newsletter:manage"]'::jsonb
      WHERE "name" = 'super_admin'
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET "description" = 'Can create, update, publish, and unpublish tours and blog posts, and manage team members, events, and the calendar.',
          "permissions" = '["tags:manage","tours:manage","blogs:manage","team_members:manage","events:manage"]'::jsonb
      WHERE "name" = 'editor'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles"
      SET "description" = 'Full access to users, roles, content, languages, settings, and newsletter subscribers.',
          "permissions" = '["admin_users:manage","roles:manage","languages:manage","tags:manage","tours:manage","blogs:manage","newsletter:manage"]'::jsonb
      WHERE "name" = 'super_admin'
    `);

    await queryRunner.query(`
      UPDATE "roles"
      SET "description" = 'Can create, update, publish, and unpublish tours and blog posts.',
          "permissions" = '["tags:manage","tours:manage","blogs:manage"]'::jsonb
      WHERE "name" = 'editor'
    `);
  }
}
