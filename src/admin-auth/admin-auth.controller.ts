import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AuthenticatedAdmin } from './authenticated-admin.interface';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Controller('admin/auth')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class AdminAuthController {
  @Get('me')
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return admin;
  }

  @Post('logout')
  logout() {
    return {
      logoutStrategy: 'client_discard_bearer_token',
    };
  }
}
