import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ErrorResponseDto } from '../swagger/swagger.models';
import { AdminMediaService } from '../admin-media/admin-media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly adminMediaService: AdminMediaService) {}

  @ApiOperation({
    summary: 'Fetch public media content',
    description: 'Streams the stored file bytes for one reusable media asset by UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Media asset UUID.',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Stored media file bytes.',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
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
      `inline; filename="${content.originalFilename.replace(/"/g, '')}"`,
    );

    return new StreamableFile(content.content);
  }
}
