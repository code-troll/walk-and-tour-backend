import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AuthenticatedAdmin } from './authenticated-admin.interface';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import {
  AuthenticatedAdminResponseDto,
  ErrorResponseDto,
  LogoutResponseDto,
} from '../swagger/swagger.models';

@ApiTags('Admin Auth')
@ApiBearerAuth('admin-auth')
@Controller('admin/auth')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class AdminAuthController {
  @ApiOperation({
    summary: 'Get the current authenticated admin',
    description: 'Resolves the authenticated Auth0 bearer token to the local admin user context used by guarded admin routes.',
  })
  @ApiOkResponse({
    description: 'Resolved authenticated admin context.',
    type: AuthenticatedAdminResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('me')
  me(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return admin;
  }

  @ApiOperation({
    summary: 'Describe admin logout behavior',
    description: 'The backend uses bearer tokens, so logout is handled by the client discarding the current token.',
  })
  @ApiOkResponse({
    description: 'Logout handling instructions.',
    type: LogoutResponseDto,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('logout')
  logout() {
    return {
      logoutStrategy: 'client_discard_bearer_token',
    };
  }
}
