import { HotelUserStatus } from '../shared/domain';

export interface AuthenticatedHotelUser {
  id: string;
  /**
   * The tenant boundary. Every hotel-facing query is scoped by this, and it is
   * only ever read from the resolved token — never from a request body or query
   * string.
   */
  hotelId: string;
  hotelName: string;
  username: string;
  email: string;
  status: HotelUserStatus;
  identityUserId: string;
}
