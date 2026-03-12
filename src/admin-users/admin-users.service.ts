import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { getAuth0Config } from '../admin-auth/auth0.config';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserEntity } from './admin-user.entity';
import { RolesService } from './roles.service';

@Injectable()
export class AdminUsersService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly adminUsersRepository: Repository<AdminUserEntity>,
    private readonly rolesService: RolesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureBootstrapAdminIfConfigured();
  }

  async findAll(): Promise<AdminUserEntity[]> {
    return this.adminUsersRepository.find({
      relations: {
        role: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findByIdOrThrow(id: string): Promise<AdminUserEntity> {
    const adminUser = await this.adminUsersRepository.findOne({
      where: { id },
      relations: {
        role: true,
      },
    });

    if (!adminUser) {
      throw new NotFoundException(`Admin user "${id}" was not found.`);
    }

    return adminUser;
  }

  async findByAuth0UserId(auth0UserId: string): Promise<AdminUserEntity | null> {
    return this.adminUsersRepository.findOne({
      where: { auth0UserId },
      relations: {
        role: true,
      },
    });
  }

  async findByEmail(email: string): Promise<AdminUserEntity | null> {
    return this.adminUsersRepository.findOne({
      where: { email: normalizeEmail(email) },
      relations: {
        role: true,
      },
    });
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUserEntity> {
    await this.assertRoleExists(dto.roleName);

    const email = normalizeEmail(dto.email);
    await this.assertEmailAvailable(email);

    if (dto.auth0UserId) {
      await this.assertAuth0UserIdAvailable(dto.auth0UserId);
    }

    const entity = this.adminUsersRepository.create({
      email,
      roleName: dto.roleName,
      auth0UserId: dto.auth0UserId ?? null,
      status: dto.status ?? 'invited',
      lastLoginAt: null,
    });

    return this.adminUsersRepository.save(entity);
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUserEntity> {
    const adminUser = await this.findByIdOrThrow(id);

    if (dto.roleName) {
      await this.assertRoleExists(dto.roleName);
      adminUser.roleName = dto.roleName;
    }

    if (dto.email) {
      const email = normalizeEmail(dto.email);

      if (email !== adminUser.email) {
        await this.assertEmailAvailable(email);
        adminUser.email = email;
      }
    }

    if (dto.auth0UserId !== undefined) {
      if (dto.auth0UserId !== null) {
        await this.assertAuth0UserIdAvailable(dto.auth0UserId, adminUser.id);
      }

      adminUser.auth0UserId = dto.auth0UserId;
    }

    if (dto.status) {
      adminUser.status = dto.status;
    }

    return this.adminUsersRepository.save(adminUser);
  }

  async bindAuth0Identity(
    adminUser: AdminUserEntity,
    auth0UserId: string,
  ): Promise<AdminUserEntity> {
    await this.assertAuth0UserIdAvailable(auth0UserId, adminUser.id);
    adminUser.auth0UserId = auth0UserId;

    if (adminUser.status === 'invited') {
      adminUser.status = 'active';
    }

    return this.adminUsersRepository.save(adminUser);
  }

  async updateLastLogin(adminUser: AdminUserEntity): Promise<AdminUserEntity> {
    adminUser.lastLoginAt = new Date();
    return this.adminUsersRepository.save(adminUser);
  }

  private async ensureBootstrapAdminIfConfigured(): Promise<void> {
    const config = getAuth0Config();
    const existingAdminCount = await this.adminUsersRepository.count();

    if (existingAdminCount > 0 || !config.bootstrapSuperAdminEmail) {
      return;
    }

    await this.assertRoleExists('super_admin');

    const bootstrapAdmin = this.adminUsersRepository.create({
      email: normalizeEmail(config.bootstrapSuperAdminEmail),
      roleName: 'super_admin',
      auth0UserId: config.bootstrapSuperAdminSub ?? null,
      status: config.bootstrapSuperAdminSub ? 'active' : 'invited',
      lastLoginAt: null,
    });

    await this.adminUsersRepository.save(bootstrapAdmin);
  }

  private async assertRoleExists(roleName: string): Promise<void> {
    if (!(await this.rolesService.exists(roleName))) {
      throw new NotFoundException(`Role "${roleName}" was not found.`);
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.adminUsersRepository.findOne({
      where: { email },
    });

    if (existing) {
      throw new ConflictException(`Admin user "${email}" already exists.`);
    }
  }

  private async assertAuth0UserIdAvailable(
    auth0UserId: string,
    ignoreAdminUserId?: string,
  ): Promise<void> {
    const existing = await this.adminUsersRepository.findOne({
      where: { auth0UserId },
    });

    if (existing && existing.id !== ignoreAdminUserId) {
      throw new ConflictException(`Auth0 identity "${auth0UserId}" is already linked.`);
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
