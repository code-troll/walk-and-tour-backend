import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { StorageModule } from '../storage/storage.module';
import { TagEntity } from '../tags/tag.entity';
import { PublicToursController } from './public-tours.controller';
import { TourMediaEntity } from './entities/tour-media.entity';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';
import { PublicToursService } from './public-tours.service';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([
      TourEntity,
      TourMediaEntity,
      MediaAssetEntity,
      TourItineraryStopEntity,
      TourTranslationEntity,
      TagEntity,
      LanguageEntity,
    ]),
  ],
  controllers: [ToursController, PublicToursController],
  providers: [
    ToursService,
    PublicToursService,
    TourSchemaPolicyService,
    TourPayloadValidationService,
  ],
})
export class ToursModule {}
