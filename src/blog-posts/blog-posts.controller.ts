import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { CurrentAdmin } from '../admin-auth/decorators/current-admin.decorator';
import { AuthenticatedAdmin } from '../admin-auth/authenticated-admin.interface';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { LocaleQueryDto } from '../shared/dto/locale-query.dto';
import {
  BlogAdminResponseDto,
  ErrorResponseDto,
  PublicBlogResponseDto,
} from '../swagger/swagger.models';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostsService } from './blog-posts.service';
import { PublicBlogPostsService } from './public-blog-posts.service';

@Controller()
export class BlogPostsController {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly publicBlogPostsService: PublicBlogPostsService,
  ) {}

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'List blog posts for admin management',
    description: 'Returns all blog posts with localized translation maps, public availability diagnostics, and audit metadata.',
  })
  @ApiOkResponse({
    description: 'Admin blog post records.',
    type: BlogAdminResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/blog-posts')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  findAllAdmin() {
    return this.blogPostsService.findAll();
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Get a blog post by UUID for admin management',
    description: 'Returns the full admin representation of a single blog post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Admin blog post record.',
    type: BlogAdminResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/blog-posts/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  findOneAdmin(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogPostsService.findOne(id);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Create a blog post',
    description: 'Creates a blog post with shared attributes and localized translations.',
  })
  @ApiCreatedResponse({
    description: 'Created admin blog post record.',
    type: BlogAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/blog-posts')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  createAdmin(
    @Body() dto: CreateBlogPostDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.create(dto, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Update a blog post',
    description: 'Updates shared blog data and merges translations by locale code.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Updated admin blog post record.',
    type: BlogAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch('admin/blog-posts/:id')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  updateAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.update(id, dto, admin);
  }

  @ApiTags('Public Blog Posts')
  @ApiOperation({
    summary: 'List public blog posts by locale',
    description: 'Returns only published blog posts whose requested locale also has a published translation.',
  })
  @ApiQuery({
    name: 'locale',
    description: 'Requested locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Published localized blog posts.',
    type: PublicBlogResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get('public/blog-posts')
  findAllPublic(@Query() query: LocaleQueryDto) {
    return this.publicBlogPostsService.findAll(query.locale);
  }

  @ApiTags('Public Blog Posts')
  @ApiOperation({
    summary: 'Get a public blog post by slug and locale',
    description: 'Returns a published blog post only when the requested locale is enabled and that locale has a published translation.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Public blog post slug.',
    example: 'barcelona-historic-center-guide',
  })
  @ApiQuery({
    name: 'locale',
    description: 'Requested locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Published localized public blog post.',
    type: PublicBlogResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get('public/blog-posts/:slug')
  findOnePublic(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.publicBlogPostsService.findOneBySlug(slug, query.locale);
  }
}
