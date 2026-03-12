import { Controller, Get, Param, Query } from '@nestjs/common';
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
import { PublicToursService } from './public-tours.service';

@ApiTags('Public Tours')
@Controller('public/tours')
export class PublicToursController {
  constructor(private readonly publicToursService: PublicToursService) {}

  @ApiOperation({
    summary: 'List public tours by locale',
    description: 'Returns only published tours that have a locale-specific published and schema-valid translation for the requested locale.',
  })
  @ApiQuery({
    name: 'locale',
    description: 'Requested locale code.',
    example: 'en',
  })
  @ApiOkResponse({
    description: 'Published public tours for the requested locale.',
    type: PublicTourResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get()
  findAll(@Query() query: LocaleQueryDto) {
    return this.publicToursService.findAll(query.locale);
  }

  @ApiOperation({
    summary: 'Get a public tour by slug and locale',
    description: 'Returns a published tour only when the requested locale is enabled and has a published, ready, schema-valid translation.',
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
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @Get(':slug')
  findOne(
    @Param('slug') slug: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.publicToursService.findOneBySlug(slug, query.locale);
  }
}
