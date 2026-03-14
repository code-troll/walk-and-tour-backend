import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '../admin-auth/guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from '../admin-auth/guards/admin-roles.guard';
import { ErrorResponseDto, UploadedMediaResponseDto } from '../swagger/swagger.models';
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
    summary: 'Upload an image asset for admin content',
    description:
      'Uploads one image through the configured storage driver and returns a reusable media asset descriptor.',
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
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body() dto: UploadMediaDto,
  ) {
    if (!file) {
      throw new BadRequestException('Media file is required.');
    }

    return this.adminMediaService.upload({
      file,
      folder: dto.folder,
    });
  }
}
