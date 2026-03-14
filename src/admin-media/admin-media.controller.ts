import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
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
import {
  AdminMediaAssetListResponseDto,
  AdminMediaAssetResponseDto,
  ErrorResponseDto,
  UploadedMediaResponseDto,
} from '../swagger/swagger.models';
import { ListMediaDto } from './dto/list-media.dto';
import { UploadMediaDto } from './dto/upload-media.dto';
import { AdminMediaService } from './admin-media.service';

@ApiTags('Admin Media')
@ApiBearerAuth('admin-auth')
@Controller('admin/media')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles('super_admin', 'editor')
export class AdminMediaController {
  constructor(private readonly adminMediaService: AdminMediaService) {}

  @ApiOperation({
    summary: 'List media assets',
    description:
      'Returns paginated reusable media assets for the admin media library.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'mediaType', required: false, enum: ['image', 'video'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({
    description: 'Paginated media asset records.',
    type: AdminMediaAssetListResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get()
  findAll(@Query() query: ListMediaDto) {
    return this.adminMediaService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get a media asset',
    description: 'Returns one reusable media asset by UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Media asset record.',
    type: AdminMediaAssetResponseDto,
  })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminMediaService.findOne(id);
  }

  @ApiOperation({
    summary: 'Fetch media content',
    description: 'Streams the stored file bytes for one reusable media asset.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':id/content')
  async fetchContent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    const content = await this.adminMediaService.getContent(id);

    response.setHeader('Content-Type', content.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename=\"${content.originalFilename.replace(/"/g, '')}\"`,
    );

    return new StreamableFile(content.content);
  }

  @ApiOperation({
    summary: 'Upload a media asset for admin content',
    description:
      'Uploads one image or video through the configured storage driver and returns a persisted reusable media asset descriptor.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'tours/historic-center',
        },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Stored media asset descriptor.',
    type: UploadedMediaResponseDto,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    if (!file) {
      throw new BadRequestException('Media file is required.');
    }

    return this.adminMediaService.upload({
      file,
      folder: dto.folder,
      actorId: admin.id,
    });
  }

  @ApiOperation({
    summary: 'Delete a media asset',
    description:
      'Deletes an uploaded media asset and its stored object when it is no longer referenced by any tour.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  @ApiNoContentResponse({
    description: 'Media asset deleted.',
  })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminMediaService.remove(id);
  }
}
