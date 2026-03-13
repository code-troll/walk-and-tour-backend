import { MigrationInterface, QueryRunner } from 'typeorm';

interface AdminUserRow {
  id: string;
  email: string;
  auth0_user_id: string | null;
  role_name: string;
}

export class SyncBootstrapSuperAdmin1710000000005
  implements MigrationInterface
{
  name = 'SyncBootstrapSuperAdmin1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const bootstrapEmail = normalizeEmail(
      process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL,
    );
    const bootstrapSub = normalizeNullableString(
      process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_SUB,
    );

    if (!bootstrapEmail) {
      return;
    }

    const bySub =
      bootstrapSub === null
        ? null
        : await this.findOneByAuth0UserId(queryRunner, bootstrapSub);
    const byEmail = await this.findOneByEmail(queryRunner, bootstrapEmail);
    const seededDefault = await this.findSeededBootstrapCandidate(queryRunner);

    const target = this.resolveTarget(bySub, byEmail, seededDefault);
    const status = bootstrapSub === null ? 'invited' : 'active';

    if (target) {
      await queryRunner.query(
        `
          UPDATE "admin_users"
          SET
            "email" = $2,
            "auth0_user_id" = $3,
            "role_name" = 'super_admin',
            "status" = $4,
            "updated_at" = now()
          WHERE "id" = $1
        `,
        [target.id, bootstrapEmail, bootstrapSub, status],
      );
      return;
    }

    await queryRunner.query(
      `
        INSERT INTO "admin_users" (
          "email",
          "auth0_user_id",
          "role_name",
          "status",
          "last_login_at"
        )
        VALUES ($1, $2, 'super_admin', $3, NULL)
      `,
      [bootstrapEmail, bootstrapSub, status],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const bootstrapEmail = normalizeEmail(
      process.env.AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL,
    );

    if (!bootstrapEmail) {
      return;
    }

    await queryRunner.query(
      `
        UPDATE "admin_users"
        SET
          "auth0_user_id" = NULL,
          "status" = 'invited',
          "updated_at" = now()
        WHERE "email" = $1 AND "role_name" = 'super_admin'
      `,
      [bootstrapEmail],
    );
  }

  private async findOneByAuth0UserId(
    queryRunner: QueryRunner,
    auth0UserId: string,
  ): Promise<AdminUserRow | null> {
    const rows = (await queryRunner.query(
      `
        SELECT "id", "email", "auth0_user_id", "role_name"
        FROM "admin_users"
        WHERE "auth0_user_id" = $1
        LIMIT 1
      `,
      [auth0UserId],
    )) as AdminUserRow[];

    return rows[0] ?? null;
  }

  private async findOneByEmail(
    queryRunner: QueryRunner,
    email: string,
  ): Promise<AdminUserRow | null> {
    const rows = (await queryRunner.query(
      `
        SELECT "id", "email", "auth0_user_id", "role_name"
        FROM "admin_users"
        WHERE lower("email") = $1
        LIMIT 1
      `,
      [email],
    )) as AdminUserRow[];

    return rows[0] ?? null;
  }

  private async findSeededBootstrapCandidate(
    queryRunner: QueryRunner,
  ): Promise<AdminUserRow | null> {
    const rows = (await queryRunner.query(
      `
        SELECT "id", "email", "auth0_user_id", "role_name"
        FROM "admin_users"
        WHERE lower("email") = 'admin@example.com'
          AND "role_name" = 'super_admin'
          AND "auth0_user_id" IS NULL
        ORDER BY "created_at" ASC
        LIMIT 1
      `,
    )) as AdminUserRow[];

    return rows[0] ?? null;
  }

  private resolveTarget(
    bySub: AdminUserRow | null,
    byEmail: AdminUserRow | null,
    seededDefault: AdminUserRow | null,
  ): AdminUserRow | null {
    if (bySub && byEmail && bySub.id !== byEmail.id) {
      throw new Error(
        'Bootstrap super admin migration found conflicting admin records for AUTH_BOOTSTRAP_SUPER_ADMIN_EMAIL and AUTH_BOOTSTRAP_SUPER_ADMIN_SUB.',
      );
    }

    return bySub ?? byEmail ?? seededDefault;
  }
}

function normalizeEmail(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
