import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '../providers/email/email.module';
import { IdentityModule } from '../providers/identity/identity.module';
import { TourEntity } from '../tours/entities/tour.entity';
import { HotelUserEntity } from './entities/hotel-user.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelEntity } from './entities/hotel.entity';
import { HotelsController } from './hotels.controller';
import { HotelUsersService } from './hotel-users.service';
import { HotelsService } from './hotels.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HotelEntity, HotelTourEntity, HotelUserEntity, TourEntity]),
    IdentityModule,
    EmailModule,
  ],
  controllers: [HotelsController],
  providers: [HotelsService, HotelUsersService],
  exports: [TypeOrmModule, HotelsService, HotelUsersService],
})
export class HotelsModule {}
