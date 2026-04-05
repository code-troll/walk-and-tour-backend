import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ProposalsService } from './proposals.service';

@ApiTags('Public Proposals')
@Controller('public/proposals')
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @ApiOperation({
    summary: 'Get a public proposal by hash',
    description:
      'Returns the proposal with all versions and media only when the proposal status is "sent" and it has not expired.',
  })
  @ApiParam({
    name: 'hash',
    description: 'Proposal public hash.',
    example: 'aBcDeFgHiJkL',
  })
  @ApiOkResponse({ description: 'Public proposal data.' })
  @ApiNotFoundResponse()
  @Get(':hash')
  findByHash(@Param('hash') hash: string) {
    return this.proposalsService.findByHash(hash);
  }

  @ApiOperation({
    summary: 'Fetch public proposal media',
    description: 'Streams one media asset attached to a publicly available proposal.',
  })
  @ApiParam({ name: 'hash', description: 'Proposal public hash.' })
  @ApiParam({ name: 'mediaId', description: 'Attached media asset UUID.', format: 'uuid' })
  @ApiNotFoundResponse()
  @Get(':hash/media/:mediaId')
  async getMediaContent(
    @Param('hash') hash: string,
    @Param('mediaId') mediaId: string,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ): Promise<StreamableFile> {
    const content = await this.proposalsService.getPublicMediaContent(hash, mediaId);
    response.setHeader('Content-Type', content.contentType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${content.originalFilename.replace(/"/g, '')}"`,
    );

    return new StreamableFile(content.content);
  }
}
