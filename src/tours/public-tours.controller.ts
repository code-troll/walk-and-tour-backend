import { Controller, Get, Param, Query, Res, StreamableFile } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { LocaleQueryDto } from '../shared/dto/locale-query.dto';
import { ErrorResponseDto, PublicTourResponseDto } from '../swagger/swagger.models';
import { PublicListToursDto } from './dto/list-tours.dto';
import { PublicToursService } from './public-tours.service';

@ApiTags('Public Tours')
@Controller('public/tours')
export class PublicToursController {
  constructor(private readonly publicToursService: PublicToursService) {
  }

  @ApiOperation({
    summary: 'List public tours by locale',
    description:
      'Returns only tours whose shared data is publicly valid and whose requested locale has a published, ready, and schema-valid translation, ordered by the persisted manual tour sort order.',
  })
  @ApiQuery({
    name: 'locale',
    description: 'Requested locale code.',
    example: 'en',
  })
  @ApiQuery({
    name: 'tagKeys',
    required: false,
    description:
      'Optional tag-key filter. Accepts comma-separated values or repeated query params and matches tours that include at least one of the provided tags.',
    type: String,
    isArray: true,
  })
  @ApiQuery({
    name: 'tourTypes',
    required: false,
    description:
      'Optional tour-type filter. Accepts comma-separated values or repeated query params and matches tours whose type is one of the provided values.',
    enum: ['private', 'group', 'tip_based', 'company'],
    isArray: true,
  })
  @ApiOkResponse({
    description: 'Published public tours for the requested locale.',
    type: PublicTourResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({type: ErrorResponseDto})
  @ApiNotFoundResponse({type: ErrorResponseDto})
  @Get()
  findAll(@Query() query: PublicListToursDto) {
    return this.publicToursService.findAll(query.locale, query);
  }

  @ApiOperation({
    summary: 'Get a public tour by slug and locale',
    description:
      'Returns a public tour only when the shared tour data is valid, the requested locale is enabled, and that locale has a published, ready, schema-valid translation.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Public tour slug.',
    example: 'historic-center',
  })
  @ApiQuery({
    name: 'locale',
    description: 'Requested locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Published localized public tour.',
    type: PublicTourResponseDto,
  })
  @ApiBadRequestResponse({type: ErrorResponseDto})
  @ApiNotFoundResponse({type: ErrorResponseDto})
  @Get(':slug')
  findOne(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.publicToursService.findOneBySlug(slug, query.locale);
  }

  @ApiOperation({
    summary: 'Fetch public tour media',
    description:
      'Streams one media asset attached to a tour when the tour is publicly available in at least one locale.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Public tour slug.',
    example: 'historic-center',
  })
  @ApiParam({
    name: 'mediaId',
    description: 'Attached media asset UUID.',
    format: 'uuid',
  })
  @ApiNotFoundResponse({type: ErrorResponseDto})
  @Get(':slug/media/:mediaId')
  async getMediaContent(
    @Param('slug') slug: string,
    @Param('mediaId') mediaId: string,
    @Res({passthrough: true})
    response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    const content = await this.publicToursService.getMediaContent(slug, mediaId);
    response.setHeader('Content-Type', content.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${ content.originalFilename.replace(/"/g, '') }"`,
    );

    return new StreamableFile(content.content);
  }
}
