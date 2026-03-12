import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { ErrorResponseDto, RoleResponseDto } from '../swagger/swagger.models';
import { RolesService } from './roles.service';

@ApiTags('Admin Roles')
@ApiBearerAuth('admin-auth')
@Controller('admin/roles')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({
    summary: 'List admin roles',
    description: 'Returns the local role catalog used by admin route authorization.',
  })
  @ApiOkResponse({
    description: 'Available admin roles.',
    type: RoleResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
