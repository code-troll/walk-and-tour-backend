import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedHotelUser } from '../authenticated-hotel-user.interface';
import { HotelRequest } from '../hotel-request.interface';

export const CurrentHotelUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedHotelUser => {
    const request = context.switchToHttp().getRequest<HotelRequest>();

    return request.hotelUser as AuthenticatedHotelUser;
  },
);
