import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminUsersModule } from '../admin-users/admin-users.module';
import { HotelUserEntity } from '../hotels/entities/hotel-user.entity';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { Auth0TokenVerifierService } from './auth0-token-verifier.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Global()
@Module({
  imports: [AdminUsersModule, TypeOrmModule.forFeature([HotelUserEntity])],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    Auth0TokenVerifierService,
    AdminJwtAuthGuard,
    AdminRolesGuard,
  ],
  exports: [
    AdminAuthService,
    Auth0TokenVerifierService,
    AdminJwtAuthGuard,
    AdminRolesGuard,
  ],
})
export class AdminAuthModule {}
