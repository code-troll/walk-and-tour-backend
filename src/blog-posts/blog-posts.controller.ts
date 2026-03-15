import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
  BlogMediaListResponseDto,
  BlogAdminResponseDto,
  ErrorResponseDto,
  PublicBlogResponseDto,
} from '../swagger/swagger.models';
import { SetBlogPostHeroMediaDto } from './dto/blog-post-media.dto';
import {
  CreateBlogPostTranslationDto,
  UpdateBlogPostTranslationDto,
} from './dto/blog-post-translation.dto';
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
    description:
      'Creates a minimal blog draft with shared identifier fields. Localized translations are added later through the nested translation routes.',
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
    description: 'Updates only shared blog data on the base blog post record.',
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

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Create a blog post translation',
    description:
      'Creates one localized blog translation independently from the shared blog post. New translations always start unpublished.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Admin blog post record after translation creation.',
    type: BlogAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/blog-posts/:id/translations')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  createTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateBlogPostTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.createTranslation(id, dto, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Update a blog post translation',
    description:
      'Updates one localized blog translation independently from the shared blog post. If the translation stops being publishable, it is automatically unpublished.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Locale code for the translation.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin blog post record after translation update.',
    type: BlogAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Patch('admin/blog-posts/:id/translations/:languageCode')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  updateTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @Body() dto: UpdateBlogPostTranslationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.updateTranslation(id, languageCode, dto, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Delete a blog post translation',
    description: 'Deletes one localized blog translation by locale code.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Locale code for the translation.',
    example: 'en',
  })
  @ApiNoContentResponse({
    description: 'Translation deleted successfully.',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete('admin/blog-posts/:id/translations/:languageCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  async deleteTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.blogPostsService.deleteTranslation(id, languageCode, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Publish a blog post translation',
    description:
      'Publishes one localized blog translation. This endpoint is the only place where translation publication can be enabled manually.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Locale code for the translation.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin blog post record after translation publication.',
    type: BlogAdminResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/blog-posts/:id/translations/:languageCode/publish')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  publishTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.publishTranslation(id, languageCode, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Unpublish a blog post translation',
    description:
      'Unpublishes one localized blog translation. This endpoint is the only place where translation publication can be disabled manually.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiParam({
    name: 'languageCode',
    description: 'Locale code for the translation.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Admin blog post record after translation unpublication.',
    type: BlogAdminResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/blog-posts/:id/translations/:languageCode/unpublish')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  unpublishTranslation(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('languageCode') languageCode: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.unpublishTranslation(id, languageCode, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'List attached blog media',
    description: 'Returns the hero media attached to the blog post, if any.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Attached blog media assets.',
    type: BlogMediaListResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get('admin/blog-posts/:id/media')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  listAdminMedia(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogPostsService.listMedia(id);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Set blog hero media',
    description: 'Attaches or replaces the hero media on the blog post.',
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
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post('admin/blog-posts/:id/hero-media')
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  setHeroMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetBlogPostHeroMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.blogPostsService.setHeroMedia(id, dto, admin);
  }

  @ApiTags('Admin Blog Posts')
  @ApiBearerAuth('admin-auth')
  @ApiOperation({
    summary: 'Clear blog hero media',
    description: 'Detaches the current hero media from the blog post.',
  })
  @ApiParam({
    name: 'id',
    description: 'Blog post UUID.',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Hero media cleared successfully.',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete('admin/blog-posts/:id/hero-media')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
  @AdminRoles('super_admin', 'editor')
  async clearHeroMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    await this.blogPostsService.clearHeroMedia(id, admin);
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

  @ApiTags('Public Blog Posts')
  @ApiOperation({
    summary: 'Fetch public blog media',
    description:
      'Streams the hero media attached to a publicly available blog post.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Public blog post slug.',
    example: 'barcelona-historic-center-guide',
  })
  @ApiParam({
    name: 'mediaId',
    description: 'Attached media asset UUID.',
    format: 'uuid',
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get('public/blog-posts/:slug/media/:mediaId')
  async getPublicMedia(
    @Param('slug') slug: string,
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    const content = await this.publicBlogPostsService.getMediaContent(slug, mediaId);
    response.setHeader('Content-Type', content.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename=\"${content.originalFilename.replace(/"/g, '')}\"`,
    );

    return new StreamableFile(content.content);
  }
}
