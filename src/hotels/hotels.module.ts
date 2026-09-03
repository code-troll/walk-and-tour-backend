import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TourEntity } from '../tours/entities/tour.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelEntity } from './entities/hotel.entity';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';

@Module({
  imports: [TypeOrmModule.forFeature([HotelEntity, HotelTourEntity, TourEntity])],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [TypeOrmModule, HotelsService],
})
export class HotelsModule {}
