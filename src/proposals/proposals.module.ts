import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MediaAssetEntity } from '../media/media-asset.entity';
import { EmailModule } from '../providers/email/email.module';
import { StorageModule } from '../storage/storage.module';
import { ProposalMediaEntity } from './entities/proposal-media.entity';
import { ProposalVersionEntity } from './entities/proposal-version.entity';
import { ProposalEntity } from './entities/proposal.entity';
import { ProposalsController } from './proposals.controller';
import { ProposalsService } from './proposals.service';
import { PublicProposalsController } from './public-proposals.controller';

@Module({
  imports: [
    EmailModule,
    StorageModule,
    TypeOrmModule.forFeature([
      ProposalEntity,
      ProposalVersionEntity,
      ProposalMediaEntity,
      MediaAssetEntity,
    ]),
  ],
  controllers: [ProposalsController, PublicProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
