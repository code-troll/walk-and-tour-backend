import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '../providers/email/email.module';
import { IdentityModule } from '../providers/identity/identity.module';
import { TourEntity } from '../tours/entities/tour.entity';
import { HotelUserEntity } from './entities/hotel-user.entity';
import { HotelBookingEntity } from './entities/hotel-booking.entity';
import { HotelBookingLineItemEntity } from './entities/hotel-booking-line-item.entity';
import { HotelBookingLogEntity } from './entities/hotel-booking-log.entity';
import { HotelTourEntity } from './entities/hotel-tour.entity';
import { HotelEntity } from './entities/hotel.entity';
import { HotelsController } from './hotels.controller';
import { HotelBookingsController } from './hotel-bookings.controller';
import { HotelBookingsService } from './hotel-bookings.service';
import { HotelUsersService } from './hotel-users.service';
import { HotelsService } from './hotels.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HotelEntity,
      HotelTourEntity,
      HotelUserEntity,
      HotelBookingEntity,
      HotelBookingLineItemEntity,
      HotelBookingLogEntity,
      TourEntity,
    ]),
    IdentityModule,
    EmailModule,
  ],
  controllers: [HotelsController, HotelBookingsController],
  providers: [HotelsService, HotelUsersService, HotelBookingsService],
  exports: [TypeOrmModule, HotelsService, HotelUsersService, HotelBookingsService],
})
export class HotelsModule {}
