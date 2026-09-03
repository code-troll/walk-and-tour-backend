import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HotelTourEntity } from '../hotels/entities/hotel-tour.entity';
import { HotelUserEntity } from '../hotels/entities/hotel-user.entity';
import { HotelAuthController } from './hotel-auth.controller';
import { HotelAuthService } from './hotel-auth.service';
import { HotelJwtAuthGuard } from './guards/hotel-jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([HotelUserEntity, HotelTourEntity])],
  controllers: [HotelAuthController],
  providers: [HotelAuthService, HotelJwtAuthGuard],
  exports: [HotelAuthService, HotelJwtAuthGuard],
})
export class HotelAuthModule {}
