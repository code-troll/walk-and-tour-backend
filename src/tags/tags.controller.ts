import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { ErrorResponseDto, TagResponseDto } from '../swagger/swagger.models';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('Admin Tags')
@ApiBearerAuth('admin-auth')
@Controller('admin/tags')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @ApiOperation({
    summary: 'List tags',
    description: 'Returns all registered tags ordered by key.',
  })
  @ApiOkResponse({
    description: 'Registered tags.',
    type: TagResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  @ApiOperation({
    summary: 'Create a tag',
    description: 'Creates a reusable tag with locale-specific labels.',
  })
  @ApiCreatedResponse({
    description: 'Created tag record.',
    type: TagResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @ApiOperation({
    summary: 'Update a tag',
    description: 'Replaces the localized labels for an existing tag.',
  })
  @ApiParam({
    name: 'key',
    description: 'Stable tag key.',
    example: 'history',
  })
  @ApiOkResponse({
    description: 'Updated tag record.',
    type: TagResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':key')
  update(@Param('key') key: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(key, dto);
  }
}
