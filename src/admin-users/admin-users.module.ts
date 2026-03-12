import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUserEntity } from './admin-user.entity';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { RoleEntity } from './role.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUserEntity, RoleEntity])],
  controllers: [AdminUsersController, RolesController],
  providers: [AdminUsersService, RolesService],
  exports: [TypeOrmModule, AdminUsersService, RolesService],
})
export class AdminUsersModule {}
