import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HotelTourEntity } from '../hotels/entities/hotel-tour.entity';
import { HotelUserEntity } from '../hotels/entities/hotel-user.entity';
import { HotelsModule } from '../hotels/hotels.module';
import { HotelAuthController } from './hotel-auth.controller';
import { HotelBookingsPortalController } from './hotel-bookings.controller';
import { HotelToursPortalController } from './hotel-tours.controller';
import { HotelAuthService } from './hotel-auth.service';
import { HotelJwtAuthGuard } from './guards/hotel-jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([HotelUserEntity, HotelTourEntity]), HotelsModule],
  controllers: [
    HotelAuthController,
    HotelBookingsPortalController,
    HotelToursPortalController,
  ],
  providers: [HotelAuthService, HotelJwtAuthGuard],
  exports: [HotelAuthService, HotelJwtAuthGuard],
})
export class HotelAuthModule {}
