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
import { ErrorResponseDto, LanguageResponseDto } from '../swagger/swagger.models';

import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguagesService } from './languages.service';

@ApiTags('Admin Languages')
@ApiBearerAuth('admin-auth')
@Controller('admin/languages')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @ApiOperation({
    summary: 'List configured languages',
    description: 'Returns all registered languages ordered by `sortOrder` and then by locale code.',
  })
  @ApiOkResponse({
    description: 'Registered language records.',
    type: LanguageResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  @AdminRoles('super_admin', 'editor')
  findAll() {
    return this.languagesService.findAll();
  }

  @ApiOperation({
    summary: 'Create a language',
    description: 'Registers a locale that can later be used by tags, tours, blog posts, and public locale-aware endpoints.',
  })
  @ApiCreatedResponse({
    description: 'Created language record.',
    type: LanguageResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  @AdminRoles('super_admin')
  create(@Body() dto: CreateLanguageDto) {
    return this.languagesService.create(dto);
  }

  @ApiOperation({
    summary: 'Update a language',
    description: 'Updates metadata and enablement for a previously registered language.',
  })
  @ApiParam({
    name: 'code',
    description: 'Existing locale code to update.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Updated language record.',
    type: LanguageResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch(':code')
  @AdminRoles('super_admin')
  update(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    return this.languagesService.update(code, dto);
  }
}
