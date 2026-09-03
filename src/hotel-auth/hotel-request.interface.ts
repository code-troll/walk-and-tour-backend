import { AuthenticatedHotelUser } from './authenticated-hotel-user.interface';

/**
 * Note the key is `hotelUser`, not `admin`. `AdminRolesGuard` reads
 * `request.admin` and is injectable everywhere, so reusing that key would let a
 * hotel identity satisfy an admin role check.
 */
export interface HotelRequest {
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  hotelUser?: AuthenticatedHotelUser;
}
