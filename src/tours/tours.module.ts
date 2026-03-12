import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LanguageEntity } from '../languages/language.entity';
import { TagEntity } from '../tags/tag.entity';
import { TourItineraryStopEntity } from './entities/tour-itinerary-stop.entity';
import { TourTranslationEntity } from './entities/tour-translation.entity';
import { TourEntity } from './entities/tour.entity';
import { TourPayloadValidationService } from './tour-payload-validation.service';
import { TourSchemaPolicyService } from './tour-schema-policy.service';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TourEntity,
      TourItineraryStopEntity,
      TourTranslationEntity,
      TagEntity,
      LanguageEntity,
    ]),
  ],
  controllers: [ToursController],
  providers: [
    ToursService,
    TourSchemaPolicyService,
    TourPayloadValidationService,
  ],
})
export class ToursModule {}
