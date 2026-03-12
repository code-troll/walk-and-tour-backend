import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { AdminUserResponseDto, ErrorResponseDto } from '../swagger/swagger.models';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUsersService } from './admin-users.service';

@ApiTags('Admin Users')
@ApiBearerAuth('admin-auth')
@Controller('admin/users')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @ApiOperation({
    summary: 'List admin users',
    description: 'Returns all local admin users with their expanded role records.',
  })
  @ApiOkResponse({
    description: 'Admin users.',
    type: AdminUserResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll() {
    return this.adminUsersService.findAll();
  }

  @ApiOperation({
    summary: 'Create an admin user',
    description: 'Creates a local admin user record that can later authenticate through Auth0 mapping.',
  })
  @ApiCreatedResponse({
    description: 'Created admin user.',
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  create(@Body() dto: CreateAdminUserDto) {
    return this.adminUsersService.create(dto);
  }

  @ApiOperation({
    summary: 'Update an admin user',
    description: 'Updates email, role, Auth0 mapping, or status of an existing local admin user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Admin user UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Updated admin user.',
    type: AdminUserResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.adminUsersService.update(id, dto);
  }
}
